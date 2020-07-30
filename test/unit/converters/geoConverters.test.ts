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
import * as GeoConverters from '../../../src/converters/geoConverters';

describe('GeoConverters module', () => {
    describe('coordinateLatLong converter', () => {
        test('correctly parses valid coordinates', () => {
            [
                { coord: '12.345, -67.89', expected: { latitude: 12.345, longitude: -67.89 } },
                { coord: ['10', '20'], expected: { latitude: 10, longitude: 20 } },
                { coord: [20, 30], expected: { latitude: 20, longitude: 30 } },
            ].forEach((test) => {
                expect(GeoConverters.coordinateLatLong.convert(test.coord))
                    .toSucceedWith(test.expected);
            });
        });

        test('fails for invalid coordinates', () => {
            [
                { coord: '12.345', expected: /malformed/i },
                { coord: '122.123, 456.789', expected: /invalid latitude.*\n.*invalid longitude/i },
                { coord: '12.345, whatever', expected: /not a number/i },
            ].forEach((test) => {
                expect(GeoConverters.coordinateLatLong.convert(test.coord))
                    .toFailWith(test.expected);
            });
        });
    });

    describe('coordinateFromLongLat converter', () => {
        test('correctly parses valid coordinates', () => {
            [
                { coord: '12.345, -67.89', expected: { longitude: 12.345, latitude: -67.89 } },
                { coord: ['10', '20'], expected: { longitude: 10, latitude: 20 } },
                { coord: [20, 30], expected: { longitude: 20, latitude: 30 } },
            ].forEach((test) => {
                expect(GeoConverters.coordinateLongLat.convert(test.coord))
                    .toSucceedWith(test.expected);
            });
        });

        test('fails for invalid coordinates', () => {
            [
                { coord: '12.345', expected: /malformed/i },
                { coord: '456.789, 122.123', expected: /invalid latitude.*\n.*invalid longitude/i },
                { coord: '12.345, whatever', expected: /not a number/i },
            ].forEach((test) => {
                expect(GeoConverters.coordinateLongLat.convert(test.coord))
                    .toFailWith(test.expected);
            });
        });
    });

    describe('string coordinate converters', () => {
        test('fail for non-string', () => {
            expect(GeoConverters.coordinateFromStringLatLong.convert({ latitude: 10, longitude: 20 }))
                .toFailWith(/non-string/i);
            expect(GeoConverters.coordinateFromStringLongLat.convert({ latitude: 10, longitude: 20 }))
                .toFailWith(/non-string/i);
        });
    });
    describe('regionFromObjectLatLong converter', () => {
        test('correctly parses a valid region', () => {
            [
                {
                    source: { min: '56.789, -123.456', max: '54.321, -122.345' },
                    expected: {
                        min: { latitude: 56.789, longitude: -123.456 },
                        max: { latitude: 54.321, longitude: -122.345 },
                    },
                },
            ].forEach((test) => {
                expect(GeoConverters.regionFromObjectLatLong.convert(test.source))
                    .toSucceedWith(test.expected);
            });
        });
    });

    describe('regionFromObjectLongLat converter', () => {
        test('correctly parses a valid region', () => {
            [
                {
                    source: { min: '-123.456, 56.789', max: '-122.345, 54.321' },
                    expected: {
                        min: { latitude: 56.789, longitude: -123.456 },
                        max: { latitude: 54.321, longitude: -122.345 },
                    },
                },
            ].forEach((test) => {
                expect(GeoConverters.regionFromObjectLongLat.convert(test.source))
                    .toSucceedWith(test.expected);
            });
        });
    });
});
