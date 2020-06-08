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

import * as Gym from '../../../src/pogo/gym';
import * as PoiLookupOptions from '../../../src/places/poiLookupOptions';
import { GlobalGymDirectory } from '../../../src/pogo/gymDirectory';
import { TestPoiGenerator } from '../../helpers/placeHelpers';
describe('GlobalGymDirectory class', () => {
    describe('constructor', () => {
        it('should construct with default options', () => {
            const dir = new GlobalGymDirectory();
            expect(dir.options).toEqual(PoiLookupOptions.defaultProperties);
            expect(dir.pois.size).toBe(0);
            expect(dir.zones.size).toBe(0);
            expect(dir.cities.size).toBe(0);
        });

        it('should construct with supplied options', () => {
            const dir = new GlobalGymDirectory({
                allowedZones: ['Zone 1'],
                exFilter: 'exEligible',
            });
            expect(dir.options).toEqual({
                ...PoiLookupOptions.defaultProperties,
                allowedZones: ['zone1'],
                exFilter: 'exEligible',
            });
        });

        it('should construct with supplied gyms creating zones and cities as necssary', () => {
            const testData = TestPoiGenerator.generate([
                'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
            ]);
            const testGyms = testData.poiProperties.map((p) => {
                return new Gym.Gym({ ...p, isExEligible: true });
            });

            const dir = new GlobalGymDirectory(undefined, testGyms);
            expect(dir.pois.size).toEqual(testData.poiProperties.length);
            expect(dir.zones.size).toEqual(testData.zones.length);
            expect(dir.cities.size).toEqual(testData.cities.length);
        });
    });

    describe('tryGetPois method', () => {
        const testData = TestPoiGenerator.generate([
            'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
        ]);
        testData.poiProperties[0].alternateNames = ['First POI'];
        testData.poiProperties[4].alternateNames = ['Point the First', 'duplicate'];
        testData.poiProperties[5].alternateNames = ['Point the Second', 'duplicate'];
        let eligible = false;
        const testGyms = testData.poiProperties.map((p) => {
            eligible = !eligible;
            return new Gym.Gym({ ...p, isExEligible: eligible });
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
            const dir = new GlobalGymDirectory({ exFilter: 'exEligible' }, testGyms);
            const gyms = dir.lookup('point');
            expect(gyms).toHaveLength(1);
            expect(gyms[0].item.isExEligible).toBe(true);
        });

        it('should return only non-EX gyms if exFilter is "nonEx"', () => {
            const dir = new GlobalGymDirectory({ exFilter: 'nonEx' }, testGyms);
            const gyms = dir.lookup('point');
            expect(gyms).toHaveLength(1);
            expect(gyms[0].item.isExEligible).toBe(false);
        });
    });
});
