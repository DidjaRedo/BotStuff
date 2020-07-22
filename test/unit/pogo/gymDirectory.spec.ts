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
import * as GymConverters from '../../../src/pogo/converters/gymConverters';
import * as PoiLookupOptions from '../../../src/places/poiLookupOptions';
import { GlobalGymDirectory, GymLookupOptionsProperties } from '../../../src/pogo/gymDirectory';
import { Gym } from '../../../src/pogo/gym';
import { TestPoiGenerator } from '../../helpers/placeHelpers';
import { succeed } from '../../../src/utils/result';

describe('GlobalGymDirectory class', () => {
    describe('constructor and createGymDirectory static method', () => {
        it('should construct with default options', () => {
            [
                new GlobalGymDirectory(),
                GlobalGymDirectory.createGymDirectory().getValueOrDefault(),
            ].forEach((dir) => {
                expect(dir).toBeDefined();
                if (dir !== undefined) {
                    expect(dir.options).toEqual(PoiLookupOptions.defaultProperties);
                    expect(dir.pois.size).toBe(0);
                    expect(dir.zones.size).toBe(0);
                    expect(dir.cities.size).toBe(0);
                }
            });
        });

        it('should construct with supplied options', () => {
            const options: Partial<GymLookupOptionsProperties> = {
                allowedZones: ['Zone 1'],
                exFilter: 'exEligible',
            };
            [
                new GlobalGymDirectory(options),
                GlobalGymDirectory.createGymDirectory(options).getValueOrDefault(),
            ].forEach((dir) => {
                expect(dir?.options).toEqual({
                    ...PoiLookupOptions.defaultProperties,
                    allowedZones: ['zone1'],
                    exFilter: 'exEligible',
                });
            });
        });

        it('should construct with supplied gyms creating zones and cities as necssary', () => {
            const testData = TestPoiGenerator.generate([
                'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
            ]);
            const testGyms = testData.poiProperties.map((p) => {
                return new Gym({ ...p, isExEligible: true });
            });

            [
                new GlobalGymDirectory(undefined, testGyms),
                GlobalGymDirectory.createGymDirectory(undefined, testGyms).getValueOrDefault(),
            ].forEach((dir) => {
                expect(dir).toBeDefined();
                if (dir !== undefined) {
                    expect(dir.pois.size).toEqual(testData.poiProperties.length);
                    expect(dir.zones.size).toEqual(testData.zones.length);
                    expect(dir.cities.size).toEqual(testData.cities.length);
                }
            });
        });
    });

    describe('getAll method', () => {
        const testData = TestPoiGenerator.generate([
            'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
        ]);
        let eligible = false;
        const testGyms = testData.poiProperties.map((p) => {
            eligible = !eligible;
            return new Gym({ ...p, isExEligible: eligible });
        });

        it('should filter based on supplied options', () => {
            const dir = new GlobalGymDirectory(undefined, testGyms);

            expect(dir.getAll()).toEqual(expect.arrayContaining(testGyms));
            expect(dir.getAll({ exFilter: 'exEligible' })).toEqual(
                expect.arrayContaining(testGyms.filter((g) => g.isExEligible === true))
            );
            expect(dir.getAll({ exFilter: 'nonEx' })).toEqual(
                expect.arrayContaining(testGyms.filter((g) => g.isExEligible === false))
            );
        });
    });

    describe('lookup method', () => {
        const testData = TestPoiGenerator.generate([
            'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
        ]);
        testData.poiProperties[0].alternateNames = ['First POI'];
        testData.poiProperties[4].alternateNames = ['Point the First', 'duplicate'];
        testData.poiProperties[5].alternateNames = ['Point the Second', 'duplicate'];
        let eligible = false;
        const testGyms = testData.poiProperties.map((p) => {
            eligible = !eligible;
            return new Gym({ ...p, isExEligible: eligible });
        });

        it('should return both EX and non-EX gyms if no filter is specified', () => {
            const dir = new GlobalGymDirectory(undefined, testGyms);
            const gyms = dir.lookup('point');
            expect(gyms).toHaveLength(2);
            expect(gyms.map((g) => g.item.isExEligible)).toEqual(
                expect.arrayContaining([true, false]),
            );
        });

        it('should return only EX gyms if exFilter is "exEligible"', () => {
            const dir = new GlobalGymDirectory(undefined, testGyms);
            const gyms = dir.lookup('point', { exFilter: 'exEligible' });
            expect(gyms).toHaveLength(1);
            expect(gyms[0].item.isExEligible).toBe(true);
        });

        it('should return only non-EX gyms if exFilter is "nonEx"', () => {
            const dir = new GlobalGymDirectory(undefined, testGyms);
            const gyms = dir.lookup('point', { exFilter: 'nonEx' });
            expect(gyms).toHaveLength(1);
            expect(gyms[0].item.isExEligible).toBe(false);
        });
    });

    describe('filter static method', () => {
        const testData = TestPoiGenerator.generate([
            'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
        ]);
        let eligible = false;
        const testGyms = testData.poiProperties.map((p) => {
            eligible = !eligible;
            return new Gym({ ...p, isExEligible: eligible });
        });

        it('should return true for EX and non-EX gyms if no options are specified', () => {
            for (const gym of testGyms) {
                expect(GlobalGymDirectory.filter(gym, undefined)).toEqual(true);
            }
        });

        it('should return true only for EX gyms if exFilter is "exEligible"', () => {
            for (const gym of testGyms) {
                expect(GlobalGymDirectory.filter(gym, { exFilter: 'exEligible' })).toEqual(gym.isExEligible);
            }
        });

        it('should return true only for non-EX gyms if exFilter is "nonEx"', () => {
            for (const gym of testGyms) {
                expect(GlobalGymDirectory.filter(gym, { exFilter: 'nonEx' })).toEqual(!gym.isExEligible);
            }
        });
    });

    describe('globalGymDirectory converters', () => {
        it('should load a valid list of arrays or objects', () => {
            let dir1: GlobalGymDirectory|undefined;
            let dir2: GlobalGymDirectory|undefined;
            expect(GymConverters.loadGlobalGymDirectorySync('./test/unit/pogo/data/gymArrays.json')
                .onSuccess((dir) => {
                    dir1 = dir;
                    return succeed(dir);
                }),
            ).toSucceed();
            expect(GymConverters.loadGlobalGymDirectorySync('./test/unit/pogo/data/gymObjects.json')
                .onSuccess((dir) => {
                    dir2 = dir;
                    return succeed(dir);
                }),
            ).toSucceed();

            // just directly comparing dir2 & dir1 works but when the comparison fails
            // it gives an unhelpful error (entries called on incompatible receiver),
            // presumably when trying to generate the diff.  Comparing pois, cities
            // and zones directly seems to work fine.
            // expect(dir2).toEqual(dir1)
            expect(dir2?.pois).toEqual(dir1?.pois);
            expect(dir2?.cities).toEqual(dir1?.cities);
            expect(dir2?.zones).toEqual(dir1?.zones);
        });
    });
});
