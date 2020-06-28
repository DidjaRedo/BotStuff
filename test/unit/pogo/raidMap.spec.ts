/*
 * Copyright (c) 2020 Erik Fortune
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import '../../helpers/jestHelpers';
import { Raid, RaidJson } from '../../../src/pogo/raid';
import { RaidMap, loadRaidMapSync } from '../../../src/pogo/raidMap';
import { TestRaid, TestRaidGenerator } from '../../helpers/pogoHelpers';
import { Gym } from '../../../src/pogo/gym';
import fs from 'fs';
import { loadBossDirectorySync } from '../../../src/pogo/bossDirectory';
import { loadGlobalGymDirectorySync } from '../../../src/pogo/gymDirectory';
import moment from 'moment';

describe('RaidMap module', () => {
    const testRaids = TestRaidGenerator.generate([
        'A12|ex|future|3',
        'A23|nonex|egg|4',
        'B34|ex|hatched|5|boss',
        'B23|nonex',
        'A3|nonex|hatched|2|boss',
        'B4|ex|expired|3',
        'B23|ex|expired|4|boss',
    ]);
    const allRaids = testRaids.getRaids();

    describe('RaidMap class', () => {
        describe('constructor and create', () => {
            it('should construct with default options', () => {
                const map = new RaidMap();
                expect(map.size).toBe(0);

                expect(RaidMap.create()).toSucceedWithCallback((map2: RaidMap) => {
                    expect(map2.size).toBe(0);
                });
            });

            it('should construct with the supplied raids', () => {
                const map = new RaidMap(allRaids);
                expect(map.size).toBe(allRaids.length);

                expect(RaidMap.create(allRaids)).toSucceedWithCallback((map2: RaidMap) => {
                    expect(map2.size).toBe(allRaids.length);
                });
            });
        });

        describe('add and addRange methods', () => {
            // mostly testing add through addRange
            it('should succeed for valid raids', () => {
                const map = new RaidMap();
                expect(map.addRange(allRaids)).toSucceedWith(expect.arrayContaining(
                    allRaids,
                ));
            });

            it('should fail for a new raid at an existing gym', () => {
                const map = new RaidMap(allRaids);
                const raid = TestRaid.cloneShifted(allRaids[0]).getValueOrThrow();

                expect(map.addRange([raid])).toFailWith(/already exists/i);
            });
        });
    });

    describe('addOrUpdate and addOrUpdateRange methods', () => {
        // mostly testing add through addRange
        it('should succeed for valid raids', () => {
            const map = new RaidMap();
            expect(map.addOrUpdateRange(allRaids)).toSucceedWith(
                expect.arrayContaining(allRaids),
            );
        });

        it('should succeed for a new raid at an existing gym', () => {
            const map = new RaidMap(allRaids);
            const raid = TestRaid.cloneShifted(allRaids[0]).getValueOrThrow();

            expect(map.tryGet(raid.gymName)).not.toEqual(raid);
            expect(map.addOrUpdateRange([raid])).toSucceedWith(
                expect.arrayContaining([raid]),
            );
            expect(map.tryGet(raid.gymName)).toEqual(raid);
        });

        it('should suceeed with an emptyl list for undefined', () => {
            const map = new RaidMap();
            expect(map.addRange(undefined)).toSucceedWith([]);
            expect(map.addOrUpdateRange(undefined)).toSucceedWith([]);
        });
    });

    describe('getters', () => {
        const map = new RaidMap(allRaids);
        it('should retrieve an existing raid at the named gym', () => {
            expect(map.getStrict(allRaids[0].gymName)).toSucceedWith(allRaids[0]);
            expect(map.tryGet(allRaids[1].gymName)).toBe(allRaids[1]);
            expect(map.get(allRaids[2].gymName)).toBe(allRaids[2]);
        });

        describe('with a gym that has no raid', () => {
            it('should return an error for getString', () => {
                expect(map.getStrict('xyzzy')).toFailWith(/no raid found/i);
            });

            it('should return undefined for get or tryGet', () => {
                expect(map.get('fizzgig')).toBeUndefined();
                expect(map.tryGet('fizzgig')).toBeUndefined();
            });
        });

        describe('getRaidsAtGyms method', () => {
            const actualGyms = allRaids.map((r) => r.gym);

            it('should get any matching raids', () => {
                expect(map.getRaidsAtGyms(actualGyms).all()).toEqual(allRaids);
            });

            it('should ignore gyms without raids', () => {
                const gym = new Gym({
                    name: 'Xyzzy',
                    city: 'zork',
                    zones: ['gue'],
                    coord: { latitude: 20, longitude: 20 },
                    isExEligible: true,
                });
                const extraGyms = [gym, ...actualGyms];
                expect(map.getRaidsAtGyms(extraGyms).all()).toEqual(allRaids);
            });

            it('should apply options if supplied', () => {
                expect(map.getRaidsAtGyms(actualGyms, { exFilter: 'exEligible' }).all()).toEqual(
                    allRaids.filter((r) => r.gym.isExEligible === true)
                );

                expect(map.getRaidsAtGyms(actualGyms, { exFilter: 'nonEx' }).all()).toEqual(
                    allRaids.filter((r) => r.gym.isExEligible === false)
                );
            });
        });
    });

    describe('setters', () => {
        it('should add a correctly named raid if it does not collide with an existing raid', () => {
            const map = new RaidMap();

            expect(map.has(allRaids[0].gymName)).toBe(false);
            expect(map.set(allRaids[0].gymName, allRaids[0])).toBe(map);
            expect(map.has(allRaids[0].gymName)).toBe(true);

            expect(map.has(allRaids[1].gymName)).toBe(false);
            expect(map.setStrict(allRaids[1].gymName, allRaids[1])).toSucceedWith(allRaids[1]);
            expect(map.has(allRaids[1].gymName)).toBe(true);

            expect(map.has(allRaids[2].gymName)).toBe(false);
            expect(map.trySet(allRaids[2].gymName, allRaids[2])).toSucceedWith(allRaids[2]);
            expect(map.has(allRaids[2].gymName)).toBe(true);
        });

        it('should fail if the name does not match the normalized gym name', () => {
            const map = new RaidMap();

            expect(map.has('xyzzy')).toBe(false);
            expect(() => map.set('xyzzy', allRaids[0])).toThrowError(/mismatched name/i);

            expect(map.has('xyzzy')).toBe(false);
            expect(map.trySet('xyzzy', allRaids[0])).toFailWith(/mismatched name/i);

            expect(map.has('xyzzy')).toBe(false);
            expect(map.setStrict('xyzzy', allRaids[0])).toFailWith(/mismatched name/i);

            expect(map.has('xyzzy')).toBe(false);
        });

        describe('for a conflicting raid', () => {
            it('should fail for setStrict or succeed with set or trySet', () => {
                const map = new RaidMap(allRaids);
                const dup0 = TestRaid.cloneShifted(allRaids[0]).getValueOrThrow();
                const dup1 = TestRaid.cloneShifted(allRaids[1]).getValueOrThrow();

                expect(map.setStrict(dup0.gymName, dup0)).toFailWith(/raid already exists/i);
                expect(map.get(dup0.gymName)).toBe(allRaids[0]);

                expect(map.set(dup0.gymName, dup0)).toBe(map);
                expect(map.get(dup0.gymName)).toBe(dup0);

                expect(map.trySet(dup1.gymName, dup1)).toSucceedWith(dup1);
                expect(map.get(dup1.gymName)).toBe(dup1);
            });
        });
    });

    describe('clear method', () => {
        it('should remove all raids', () => {
            const map = new RaidMap(allRaids);
            expect(map.size).toBe(allRaids.length);
            expect(() => map.clear()).not.toThrow();
            expect(map.size).toBe(0);
        });
    });

    describe('delete method', () => {
        it('should delete an existing raid by name and return true', () => {
            const map = new RaidMap(allRaids);
            expect(map.size).toBe(allRaids.length);
            expect(map.has(allRaids[0].gymName)).toBe(true);
            expect(map.delete(allRaids[0].gymName)).toBe(true);
            expect(map.has(allRaids[0].gymName)).toBe(false);
            expect(map.size).toBe(allRaids.length - 1);
        });

        it('should delete an existing raid by gym and return true', () => {
            const map = new RaidMap(allRaids);
            expect(map.size).toBe(allRaids.length);
            expect(map.has(allRaids[0].gymName)).toBe(true);
            expect(map.delete(allRaids[0].gym)).toBe(true);
            expect(map.has(allRaids[0].gymName)).toBe(false);
            expect(map.size).toBe(allRaids.length - 1);
        });

        it('should delete an existing raid and return true', () => {
            const map = new RaidMap(allRaids);
            expect(map.size).toBe(allRaids.length);
            expect(map.has(allRaids[0].gymName)).toBe(true);
            expect(map.delete(allRaids[0])).toBe(true);
            expect(map.has(allRaids[0].gymName)).toBe(false);
            expect(map.size).toBe(allRaids.length - 1);
        });

        it('should return false if no such raid exists', () => {
            const map = new RaidMap(allRaids);
            expect(map.delete('xyyyz')).toBe(false);
            expect(map.size).toBe(allRaids.length);
        });
    });

    describe('remove method', () => {
        it('should remove an existing raid by name and return the raid', () => {
            const map = new RaidMap(allRaids);
            expect(map.size).toBe(allRaids.length);
            expect(map.has(allRaids[0].gymName)).toBe(true);
            expect(map.remove(allRaids[0].gymName)).toSucceedWith(allRaids[0]);
            expect(map.has(allRaids[0].gymName)).toBe(false);
            expect(map.size).toBe(allRaids.length - 1);
        });

        it('should remove an existing raid by gym and return true', () => {
            const map = new RaidMap(allRaids);
            expect(map.size).toBe(allRaids.length);
            expect(map.has(allRaids[0].gymName)).toBe(true);
            expect(map.remove(allRaids[0].gym)).toSucceedWith(allRaids[0]);
            expect(map.has(allRaids[0].gymName)).toBe(false);
            expect(map.size).toBe(allRaids.length - 1);
        });

        it('should remove an existing raid and return true', () => {
            const map = new RaidMap(allRaids);
            expect(map.size).toBe(allRaids.length);
            expect(map.has(allRaids[0].gymName)).toBe(true);
            expect(map.remove(allRaids[0])).toSucceedWith(allRaids[0]);
            expect(map.has(allRaids[0].gymName)).toBe(false);
            expect(map.size).toBe(allRaids.length - 1);
        });

        it('should return an error if no such raid or gym exists', () => {
            const map = new RaidMap(allRaids);
            expect(map.remove('xyyyz')).toFailWith(/no raid found/i);
            expect(map.size).toBe(allRaids.length);
            expect(map.remove('retrofitting')).toFailWith(/no raid found/i);
            expect(map.remove(allRaids[0])).toSucceedWith(allRaids[0]);
            expect(map.remove(allRaids[0])).toFailWith(/no raid at/i);
        });
    });

    describe('entries, keys and values', () => {
        const map = new RaidMap(allRaids);

        it('should return all entries, keys or values', () => {
            expect(Array.from(map.entries())).toEqual(
                allRaids.map((r) => { return [r.keys.gymName, r]; }),
            );

            expect(Array.from(map.keys())).toEqual(
                allRaids.map((r) => r.keys.gymName),
            );

            expect(Array.from(map.values())).toEqual(allRaids);
        });
    });

    describe('iterator and forEach method', () => {
        it('should return all elements', () => {
            const map = new RaidMap(allRaids);

            const r1: [string, Raid][] = [];
            const r2: Raid[] = [];
            for (const raid of map) {
                r1.push(raid);
            }

            map.forEach((r) => r2.push(r));

            expect(r1).toEqual(allRaids.map((r) => [r.keys.gymName, r]));
            expect(r2).toEqual(allRaids);
        });

        describe('[toStringTag]', () => {
            it('should be RaidMap', () => {
                expect(new RaidMap().toString()).toBe('[object RaidMap]');
            });
        });
    });

    describe('converters', () => {
        const gyms = loadGlobalGymDirectorySync('./test/unit/pogo/data/gymObjects.json').getValueOrThrow();
        const bosses = loadBossDirectorySync('./test/unit/pogo/data/validBossDirectory.json').getValueOrThrow();
        const past = moment().subtract(10, 'minutes').toDate();
        const future = moment().add(10, 'minutes').toDate();
        const raids = [
            { hatch: past.toISOString(), boss: 'lugiat5', gym: 'mysterioushatch', type: 'normal' },
            { hatch: future.toISOString(), tier: 3, gym: 'paintedparkinglot', type: 'raid-hour' },
        ].map((json) => {
            return Raid.createFromJson(json as RaidJson, gyms, bosses).getValueOrThrow();
        });
        let nextIsArray = false;
        const testData = raids.map((r) => {
            nextIsArray = !nextIsArray;
            return nextIsArray ? r.toArray() : r.toJson();
        });
        const testBlob = JSON.stringify(testData);

        it('should load either arrays or objects', () => {
            const path = 'path/to/some/file.json';
            jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
                return testBlob;
            });

            const loadResult = loadRaidMapSync(path, gyms, bosses);
            expect(loadResult).toSucceedWithCallback((dir: RaidMap) => {
                expect(Array.from(dir.values())).toEqual(raids);
            });
        });
    });
});
