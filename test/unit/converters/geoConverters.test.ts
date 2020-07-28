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
import * as GeoConverters from '../../../src/converters/geoConverters';

describe('GeoConverters module', () => {
    describe('coordinateFromString converter', () => {
        test('correctly parses valid coordinates', () => {
            [
                { coord: '12.345, -67.89', expected: { latitude: 12.345, longitude: -67.89 } },
            ].forEach((test) => {
                const result = GeoConverters.coordinateFromString.convert(test.coord);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(test.expected);
                }
            });
        });

        test('fails for invalid coordinates', () => {
            [
                { coord: '12.345', expected: /malformed/i },
                { coord: '122.123, 456.789', expected: /invalid latitude.*\n.*invalid longitude/i },
                { coord: '12.345, whatever', expected: /not a number/i },
                { coord: { latitude: 12, longitude: 34 }, expected: /non-string/i },
            ].forEach((test) => {
                const result = GeoConverters.coordinateFromString.convert(test.coord);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(test.expected);
                }
            });
        });
    });

    describe('regionFromObject converter', () => {
        test('correctly parses a valid region', () => {
            [
                {
                    source: { nw: '56.789, -123.456', se: '54.321, -122.345' },
                    expected: {
                        nw: { latitude: 56.789, longitude: -123.456 },
                        se: { latitude: 54.321, longitude: -122.345 },
                    },
                },
            ].forEach((test) => {
                const result = GeoConverters.regionFromObject.convert(test.source);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(test.expected);
                }
            });
        });
    });
});
