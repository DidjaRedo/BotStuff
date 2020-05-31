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
import * as Geo from '../../../src/utils/geo';

describe('Geo module', () => {
    describe('isValidLongitude', () => {
        it('should return true or valid longitudes', () => {
            [-180, -90, 0, 90, 180].forEach((l) => {
                expect(Geo.isValidLongitude(l)).toBe(true);
            });
        });

        it('should return false on invalid longitudes', () => {
            [-200, 200, -180.1, NaN].forEach((l) => {
                expect(Geo.isValidLongitude(l)).toBe(false);
            });
        });
    });

    describe('isValidLatitude', () => {
        it('should return true or valid latitudes', () => {
            [-90, -45, 0, 45, 90].forEach((l) => {
                expect(Geo.isValidLatitude(l)).toBe(true);
            });
        });

        it('should return false on invalid latitudes', () => {
            [-91, 91, -90.1, NaN].forEach((l) => {
                expect(Geo.isValidLatitude(l)).toBe(false);
            });
        });
    });

    describe('coordinateIsInRegion', () => {
        it('should return true if a coordinate is in the region', () => {
            const region = {
                min: { latitude: 42, longitude: -125 },
                max: { latitude: 43, longitude: -123 },
            };

            [
                { latitude: region.min.latitude, longitude: region.min.longitude },
                { latitude: region.min.latitude, longitude: region.max.longitude },
                { latitude: region.max.latitude, longitude: region.min.longitude },
                { latitude: region.max.latitude, longitude: region.max.longitude },
                {
                    latitude: (region.min.latitude + region.max.latitude) / 2,
                    longitude: (region.min.longitude + region.max.longitude) / 2,
                },
            ].forEach((c) => {
                expect(Geo.coordinateIsInRegion(c, region)).toBe(true);
            });
        });

        it('should return true for an undefined region', () => {
            expect(Geo.coordinateIsInRegion({ latitude: 45, longitude: -122 })).toBe(true);
        });
    });
});
