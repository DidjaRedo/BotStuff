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

describe('PoGo Gym module', () => {
    describe('Gym class', () => {
        describe('constructor', () => {
            it('should construct a gym from a valid initializer', () => {
                [
                    {
                        name: 'A gym',
                        alternateNames: ['Alpha Gym'],
                        city: 'Bigville',
                        zones: ['Hot zone'],
                        coord: {
                            latitude: 10,
                            longitude: 10,
                        },
                        isExEligible: true,
                    },
                    {
                        name: 'A gym',
                        city: 'Bigville',
                        zones: ['Hot zone'],
                        coord: {
                            latitude: 10,
                            longitude: 10,
                        },
                        isExEligible: false,
                    },
                ].forEach((init) => {
                    const gym = new Gym.Gym(init);
                    expect(gym).toBeDefined();
                    expect(gym.name).toEqual(init.name);
                    expect(gym.alternateNames).toEqual(init.alternateNames ?? []);
                    expect(gym.city).toEqual(init.city);
                    expect(gym.zones).toEqual(init.zones);
                    expect(gym.coord).toEqual(init.coord);
                    expect(gym.isExEligible).toEqual(init.isExEligible);
                });
            });
        });
    });

    describe('gymPropertiesFromArray converter', () => {
        it('should convert valid arrays', () => {
            [
                {
                    source: ['Zone 1', 'City 1', 'A POI', 'First POI', '43.210', '-123.456', 'ExEligible'],
                    expect: {
                        alternateNames: ['First POI'],
                        city: 'City 1',
                        coord: {
                            latitude: 43.21,
                            longitude: -123.456,
                        },
                        name: 'A POI',
                        zones: ['Zone 1'],
                        isExEligible: true,
                    },
                },
                {
                    source: ['Zone 1|Zone 2', 'City 1', 'A POI', 'First POI|POI the first', '43.210', '-123.456', 'NonEx'],
                    expect: {
                        alternateNames: ['First POI', 'POI the first'],
                        city: 'City 1',
                        coord: {
                            latitude: 43.21,
                            longitude: -123.456,
                        },
                        name: 'A POI',
                        zones: ['Zone 1', 'Zone 2'],
                        isExEligible: false,
                    },
                },
                {
                    source: ['Zone 1|Zone 2', 'City 1', 'A POI', '', '43.210', '-123.456', 'ExEligible'],
                    expect: {
                        alternateNames: [],
                        city: 'City 1',
                        coord: {
                            latitude: 43.21,
                            longitude: -123.456,
                        },
                        name: 'A POI',
                        zones: ['Zone 1', 'Zone 2'],
                        isExEligible: true,
                    },
                },
            ].forEach((test) => {
                const result = Gym.gymPropertiesFromArray.convert(test.source);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(test.expect);
                }
            });
        });

        it('should fail for an invalid array or non-array', () => {
            [
                { source: ['A too short array'], expect: /must have seven columns/i },
                { source: ['An', 'array', 'that', 'is', '2', '2', 'long', 'to', 'use'], expect: /must have seven columns/i },
                {
                    source: ['zone', 'city', 'name', 'alternate name', 'latitude', 'longitude', 'ExEligible'],
                    expect: /not a number/i,
                },
                {
                    source: ['zone', 'city', 'name', 'alternate name', '10', '10', 'exexex'],
                    expect: /invalid ex status/i,
                },
            ].forEach((test) => {
                const result = Gym.gymPropertiesFromArray.convert(test.source);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(test.expect);
                }
            });
        });
    });

    describe('gymPropertiesFromLegacyArray converter', () => {
        it('should convert valid arrays', () => {
            [
                {
                    source: ['xyzzy', 'Zone 1', 'City 1', 'First POI', 'A POI', '-123.456', '43.210', 'ExEligible'],
                    expect: {
                        alternateNames: ['First POI'],
                        city: 'City 1',
                        coord: {
                            latitude: 43.21,
                            longitude: -123.456,
                        },
                        name: 'A POI',
                        zones: ['Zone 1'],
                        isExEligible: true,
                    },
                },
                {
                    source: ['xyzzy', 'Zone 1|Zone 2', 'City 1', 'First POI', 'A POI|POI the first', '-123.456', '43.210', 'NonEx'],
                    expect: {
                        alternateNames: ['First POI', 'POI the first'],
                        city: 'City 1',
                        coord: {
                            latitude: 43.21,
                            longitude: -123.456,
                        },
                        name: 'A POI',
                        zones: ['Zone 1', 'Zone 2'],
                        isExEligible: false,
                    },
                },
                {
                    source: ['pfutsch', 'Zone 1|Zone 2', 'City 1', 'A POI', 'A POI', '-123.456', '43.210', 'ExEligible'],
                    expect: {
                        alternateNames: [],
                        city: 'City 1',
                        coord: {
                            latitude: 43.21,
                            longitude: -123.456,
                        },
                        name: 'A POI',
                        zones: ['Zone 1', 'Zone 2'],
                        isExEligible: true,
                    },
                },
            ].forEach((test) => {
                const result = Gym.gymPropertiesFromLegacyArray.convert(test.source);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(test.expect);
                }
            });
        });

        it('should fail for an invalid array or non-array', () => {
            [
                { source: ['A too short array'], expect: /must have eight columns/i },
                { source: ['An', 'array', 'that', 'is', '2', '2', 'long', 'to', 'use'], expect: /must have eight columns/i },
                {
                    source: ['id', 'zones', 'city', true, 'friendly name', 10, 10, 'exeligible'],
                    expect: /not a string/i,
                },
                {
                    source: ['id', 'zones', 'city', 'official name', 10, 10, 10, 'exeligible'],
                    expect: /not a string/i,
                },
                {
                    source: ['xyzzy', 'zone', 'city', 'name', 'alternate name', 'latitude', 'longitude', 'ExEligible'],
                    expect: /not a number/i,
                },
                {
                    source: ['xyzzy', 'zone', 'city', 'name', 'alternate name', '10', '10', 'exexex'],
                    expect: /invalid ex status/i,
                },
                {
                    source: ['xyzzy', 'zone', 'city', 'name', 'alternate name', '10', '10', true],
                    expect: /invalid ex status/i,
                },
            ].forEach((test) => {
                const result = Gym.gymPropertiesFromLegacyArray.convert(test.source);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(test.expect);
                }
            });
        });
    });
});
