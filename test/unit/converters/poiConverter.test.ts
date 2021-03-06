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
import * as PoiConverter from '../../../src/converters/poiConverter';
import { Poi } from '../../../src/places/poi';

describe('PoiConverters module', () => {
    describe('poiPropertiesFromArray converter', () => {
        const tests = [
            {
                source: ['Zone 1', 'City 1', 'A POI|First POI', '43.210', '-123.456'],
                expect: {
                    alternateNames: ['First POI'],
                    city: 'City 1',
                    coord: {
                        latitude: 43.21,
                        longitude: -123.456,
                    },
                    name: 'A POI',
                    zones: ['Zone 1'],
                },
            },
            {
                source: ['Zone 1|Zone 2', 'City 1', 'A POI|First POI|POI the first', '43.210', '-123.456'],
                expect: {
                    alternateNames: ['First POI', 'POI the first'],
                    city: 'City 1',
                    coord: {
                        latitude: 43.21,
                        longitude: -123.456,
                    },
                    name: 'A POI',
                    zones: ['Zone 1', 'Zone 2'],
                },
            },
            {
                source: ['Zone 1|Zone 2', 'City 1', 'A POI', '43.210', '-123.456'],
                expect: {
                    alternateNames: [],
                    city: 'City 1',
                    coord: {
                        latitude: 43.21,
                        longitude: -123.456,
                    },
                    name: 'A POI',
                    zones: ['Zone 1', 'Zone 2'],
                },
            },
        ];

        test('converts valid arrays', () => {
            tests.forEach((test) => {
                expect(PoiConverter.poiPropertiesFromArray.convert(test.source))
                    .toSucceedWith(test.expect);
            });
        });

        test('round-trips through "toArray"', () => {
            tests.forEach((test) => {
                expect(PoiConverter.poiFromArray.convert(test.source)).toSucceedAndSatisfy((poi: Poi) => {
                    expect(PoiConverter.poiFromArray.convert(poi.toArray())).toSucceedWith(poi);
                });
            });
        });

        test('round-trips through "toJson"', () => {
            tests.forEach((test) => {
                expect(PoiConverter.poiFromArray.convert(test.source)).toSucceedAndSatisfy((poi: Poi) => {
                    const json = poi.toJson();
                    expect(PoiConverter.poiFromObject.convert(json)).toSucceedWith(poi);
                });
            });
        });
    });

    test('fails for an invalid array or non-array', () => {
        [
            { source: ['A too short array'], expect: /must have five columns/i },
            { source: ['An', 'array', 'that', 'is', '2', '2', 'long'], expect: /must have five columns/i },
            {
                source: ['zone', 'city', 'names', 'latitude', 'longitude'],
                expect: /not a number/i,
            },
        ].forEach((test) => {
            expect(PoiConverter.poiPropertiesFromArray.convert(test.source))
                .toFailWith(test.expect);
        });
    });
});
