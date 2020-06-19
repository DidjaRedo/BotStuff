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
import * as PoiLookupOptions from '../../../src/places/poiLookupOptions';
import { Raid, RaidJson } from '../../../src/pogo/raid';
import { RaidDirectory, loadRaidDirectorySync } from '../../../src/pogo/raidDirectory';
import { TestRaidGenerator } from '../../helpers/pogoHelpers';
import fs from 'fs';
import { loadBossDirectorySync } from '../../../src/pogo/bossDirectory';
import { loadGlobalGymDirectorySync } from '../../../src/pogo/gymDirectory';
import moment from 'moment';

describe('RaidDirectory module', () => {
    const testRaids = TestRaidGenerator.generate([
        'A12|ex|future|3',
        'A23|nonex|egg|4',
        'B34|ex|hatched|5|boss',
        'B23|nonex',
        'A3|nonex|hatched|2|boss',
        'B4|ex|expired|3',
        'B23|ex|expired|4|boss',
    ]);

    describe('RaidDirectory class', () => {
        const defaultOptions = PoiLookupOptions.defaultProperties;

        describe('constructor', () => {
            it('should constructe with default options', () => {
                const dir = new RaidDirectory();
                expect(dir.size).toBe(0);
            });

            it('should construct with the supplied raids', () => {
                const raids = testRaids.getRaids();
                const dir = new RaidDirectory(raids);
                expect(dir.size).toBe(raids.length);
            });
        });

        describe('lookup method', () => {
            const allRaids = testRaids.getRaids();
            const dir = new RaidDirectory(allRaids);

            it('should return all raids if no filter is specified', () => {
                const foundRaids = dir.lookup('POI');
                expect(foundRaids).toHaveLength(allRaids.length);
            });

            it('should return raids matching the lookup string', () => {
                const foundRaids = dir.lookup('POI A');
                expect(foundRaids).toHaveLength(3);
            });

            it('should respect the tier filters if specified', () => {
                const foundRaids = dir.lookup('POI', {
                    ...defaultOptions,
                    minTier: 2,
                    maxTier: 3,
                });
                expect(foundRaids).toHaveLength(3);
                foundRaids.forEach((r) => expect(r.item.tier).toBeInRange(2, 3));
            });

            it('should respect the state filter if specified', () => {
                const foundRaids = dir.lookup('POI', {
                    ...defaultOptions,
                    stateFilter: ['hatched', 'egg'],
                });
                expect(foundRaids).toHaveLength(3);
                foundRaids.forEach((r) => expect(r.item.state).toBeOneOf(['hatched', 'egg']));
            });

            it('should respect the EX filter if specified', () => {
                const exRaids = dir.lookup('POI', {
                    ...defaultOptions,
                    exFilter: 'exEligible',
                });
                exRaids.forEach((r) => expect(r.item.gym.isExEligible).toBe(true));
                expect(exRaids).toHaveLength(4);

                const nonExRaids = dir.lookup('POI', {
                    ...defaultOptions,
                    exFilter: 'nonEx',
                });
                expect(nonExRaids).toHaveLength(2);
                nonExRaids.forEach((r) => expect(r.item.gym.isExEligible).toBe(false));
            });

            it('should respect a supplied filter function', () => {
                const alwaysFilter = jest.fn(() => true);
                const always = dir.lookup('POI', undefined, alwaysFilter);
                expect(always).toHaveLength(allRaids.length);
                expect(alwaysFilter).toHaveBeenCalledTimes(allRaids.length);

                const neverFilter = jest.fn(() => false);
                const never = dir.lookup('POI', undefined, neverFilter);
                expect(never).toHaveLength(0);
                expect(neverFilter).toHaveBeenCalledTimes(allRaids.length);
            });
        });
    });

    describe('converters', () => {
        const gyms = loadGlobalGymDirectorySync('./test/unit/pogo/data/gymObjects.json').getValueOrDefault();
        const bosses = loadBossDirectorySync('./test/unit/pogo/data/validBossDirectory.json').getValueOrDefault();
        const past = moment().subtract(10, 'minutes').toDate();
        const future = moment().add(10, 'minutes').toDate();
        const raids = [
            { hatch: past.toISOString(), boss: 'lugiat5', gym: 'mysterioushatch', type: 'normal' },
            { hatch: future.toISOString(), tier: 3, gym: 'paintedparkinglot', type: 'raid-hour' },
        ].map((json) => {
            return Raid.createFromJson(json as RaidJson, gyms, bosses).getValueOrDefault();
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

            const loadResult = loadRaidDirectorySync(path, gyms, bosses);
            expect(loadResult).toSucceedWithCallback((dir: RaidDirectory) => {
                expect(dir.getAll()).toEqual(expect.arrayContaining(raids));
            });
        });
    });
});
