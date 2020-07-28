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

import '@fgv/ts-utils-jest';
import * as PoiLookupOptions from '../../../src/places/poiLookupOptions';
import { GlobalGymDirectory, GymLookupOptionsProperties, optionsMerger } from '../../../src/pogo/gymDirectory';
import { Gym } from '../../../src/pogo/gym';
import { TestPoiGenerator } from '../../helpers/placeHelpers';

describe('GlobalGymDirectory class', () => {
    describe('constructor and createGymDirectory static method', () => {
        test('constructs with default options', () => {
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

        test('constructs with supplied options', () => {
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

        test('constructs with supplied gyms creating zones and cities as necssary', () => {
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

        test('filters based on supplied options', () => {
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

        test('returns both EX and non-EX gyms if no filter is specified', () => {
            const dir = new GlobalGymDirectory(undefined, testGyms);
            const gyms = dir.lookup('point');
            expect(gyms).toHaveLength(2);
            expect(gyms.map((g) => g.item.isExEligible)).toEqual(
                expect.arrayContaining([true, false]),
            );
        });

        test('returns only EX gyms if exFilter is "exEligible"', () => {
            const dir = new GlobalGymDirectory(undefined, testGyms);
            const gyms = dir.lookup('point', { exFilter: 'exEligible' });
            expect(gyms).toHaveLength(1);
            expect(gyms[0].item.isExEligible).toBe(true);
        });

        test('returns only non-EX gyms if exFilter is "nonEx"', () => {
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

        test('returns true for EX and non-EX gyms if no options are specified', () => {
            for (const gym of testGyms) {
                expect(GlobalGymDirectory.filter(gym, undefined)).toEqual(true);
            }
        });

        test('returns true only for EX gyms if exFilter is "exEligible"', () => {
            for (const gym of testGyms) {
                expect(GlobalGymDirectory.filter(gym, { exFilter: 'exEligible' })).toEqual(gym.isExEligible);
            }
        });

        test('returns true only for non-EX gyms if exFilter is "nonEx"', () => {
            for (const gym of testGyms) {
                expect(GlobalGymDirectory.filter(gym, { exFilter: 'nonEx' })).toEqual(!gym.isExEligible);
            }
        });
    });

    describe('optionsMerger', () => {
        describe('mergeInPlace merger', () => {
            test('merges into an existing object', () => {
                const baseProps: GymLookupOptionsProperties = {
                    ...PoiLookupOptions.defaultProperties,
                    allowedCities: ['paris', 'london', 'seattle'],
                    exFilter: 'nonEx',
                };
                const mergeProps: Partial<GymLookupOptionsProperties> = {
                    radius: 99999,
                    allowedCities: ['New York City'],
                    exFilter: 'exEligible',
                };
                const expected: GymLookupOptionsProperties = {
                    ...baseProps,
                    allowedCities: ['newyorkcity'],
                    radius: 99999,
                    exFilter: 'exEligible',
                };

                expect(optionsMerger.mergeInPlace(baseProps, mergeProps))
                    .toSucceedAndSatisfy((got: GymLookupOptionsProperties) => {
                        expect(got).toEqual(expected);
                        expect(got).toBe(baseProps);
                    });
            });
        });

        describe('mergeIntoCopy merger', () => {
            test('merges into a new object', () => {
                const baseProps: GymLookupOptionsProperties = {
                    ...PoiLookupOptions.defaultProperties,
                    allowedCities: ['paris', 'london', 'seattle'],
                    exFilter: 'nonEx',
                };
                const mergeProps: Partial<GymLookupOptionsProperties> = {
                    radius: 99999,
                    allowedCities: ['New York City'],
                    exFilter: 'exEligible',
                };
                const expected: GymLookupOptionsProperties = {
                    ...baseProps,
                    allowedCities: ['newyorkcity'],
                    radius: 99999,
                    exFilter: 'exEligible',
                };

                expect(optionsMerger.mergeIntoCopy(baseProps, mergeProps))
                    .toSucceedAndSatisfy((got: GymLookupOptionsProperties) => {
                        expect(got).toEqual(expected);
                        expect(got).not.toBe(baseProps);
                        expect(baseProps).not.toEqual(expected);
                    });
            });

            test('merges into the default options if base is undefined', () => {
                const mergeProps: Partial<GymLookupOptionsProperties> = {
                    allowedCities: ['New York City'],
                    exFilter: 'exEligible',
                };
                const expected: GymLookupOptionsProperties = {
                    ...PoiLookupOptions.defaultProperties,
                    allowedCities: ['newyorkcity'],
                    exFilter: 'exEligible',
                };

                expect(optionsMerger.mergeIntoCopy(undefined, mergeProps))
                    .toSucceedAndSatisfy((got: GymLookupOptionsProperties) => {
                        expect(got).toEqual(expected);
                    });
            });
        });
    });
});

