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

import { Poi, PoiKeys, PoiProperties } from '../../../src/places/poi';

describe('Poi class', (): void => {
    const good: PoiProperties[] = [
        {
            name: 'A POI',
            city: 'Gotham',
            zones: ['red', 'white'],
            coord: { latitude: 40.123, longitude: -122.123 },
        },
        {
            name: 'Another POI',
            alternateNames: ['elsewhere'],
            city: 'Metropolis',
            zones: ['white', 'blue'],
            coord: { latitude: 40.123, longitude: -122.123 },
        },
    ];

    describe('constructor', (): void => {
        test('succeeds for valid initializers', (): void => {
            good.forEach((init: PoiProperties): void => {
                const poi = new Poi(init);
                expect(poi.name).toBe(init.name);
                expect(poi.city).toBe(init.city);
                expect(poi.zones).toEqual(init.zones);
                expect(poi.coord).toEqual(init.coord);
                if (init.alternateNames) {
                    expect(poi.alternateNames).toEqual(init.alternateNames);
                    expect(poi.hasAlternateNames).toBe(true);
                    expect(poi.numAlternateNames).toBeGreaterThan(0);
                }
                else {
                    expect(poi.hasAlternateNames).toBe(false);
                    expect(poi.numAlternateNames).toBe(0);
                }

                expect(poi.getDirectionsLink()).toMatch(
                    new RegExp(`^.*google.com/maps.*destination=${poi.coord.latitude},${poi.coord.longitude}.*$`),
                );
            });
        });

        test('throws for invalid initializers', (): void => {
            const bad = [
                {
                    init: {
                        name: '',
                        city: 'Gotham',
                        zones: ['red', 'white'],
                        coord: { latitude: 40.123, longitude: -122.123 },
                    },
                    error: /poi name.*non-empty/i,
                },
                {
                    init: {
                        name: 'A POI',
                        city: '  ',
                        zones: ['red', 'white'],
                        coord: { latitude: 40.123, longitude: -122.123 },
                    },
                    error: /city name.*non-empty/i,
                },
                {
                    init: {
                        name: 'A POI',
                        city: 'Gotham',
                        zones: ['red', '   '],
                        coord: { latitude: 40.123, longitude: -122.123 },
                    },
                    error: /zone name.*non-empty/i,
                },
                {
                    init: {
                        name: 'A POI',
                        city: 'Gotham',
                        zones: ['red', 'white'],
                        coord: { latitude: Number.NaN, longitude: -122.123 },
                    },
                    error: /latitude/i,
                },
                {
                    init: {
                        name: 'A POI',
                        city: 'Gotham',
                        zones: ['red', 'white'],
                        coord: { latitude: 40.123, longitude: Number.POSITIVE_INFINITY },
                    },
                    error: /longitude/i,
                },
                {
                    init: {
                        name: 'A POI',
                        alternateNames: ['first', '    '],
                        city: 'Gotham',
                        zones: ['red', 'white'],
                        coord: { latitude: 40.123, longitude: -122.123 },
                    },
                    error: /alternate name.*non-empty/i,
                },
            ];

            bad.forEach((test): void => {
                expect((): void => {
                    const poi = new Poi(test.init);
                    console.log(`was able to create ${JSON.stringify(poi)}`);
                }).toThrowError(test.error);
            });
        });
    });

    describe('belongsToZone method', (): void => {
        const poi = new Poi({
            name: 'A POI',
            city: 'Gotham',
            zones: ['Red', 'Bright Blue'],
            coord: { latitude: 40.123, longitude: -122.123 },
        });
        describe('when passed a single zone', (): void => {
            test('returns true if the Poi belongs to the listed zone, using normalized names', (): void => {
                ['RED', 'bright Blue'].forEach((zone: string): void => {
                    expect(poi.belongsToZone(zone)).toBe(true);
                });
            });

            test('returns false if the Poi does not belong to the listed zone, using normalized names', (): void => {
                ['white', 'Blue', 'Reddish', 'Bright Blonde'].forEach((zone: string): void => {
                    expect(poi.belongsToZone(zone)).toBe(false);
                });
            });

            test('throws if the supplied name is invalid', (): void => {
                ['   ', '', undefined].forEach((zone: string|undefined): void => {
                    expect((): void => {
                        poi.belongsToZone(zone as string);
                    }).toThrowError(/invalid/i);
                });
            });
        });

        describe('isNear method', () => {
            const poi = new Poi({
                name: 'A POI',
                city: 'Gotham',
                zones: ['Red', 'Bright Blue'],
                coord: { latitude: 40, longitude: -122 },
            });
            test('returns true if within the supplied distance from the specified point', () => {
                // at latitude 40, one degree of longitude is ~85km
                // so .1 is 8.5 km.
                expect(poi.isNear({ latitude: 40, longitude: -121.99 }, 1000)).toBe(true);
                expect(poi.isNear({ latitude: 40, longitude: -121.9 }, 1000)).toBe(false);
                expect(poi.isNear({ latitude: 40, longitude: -121.9 }, 10000)).toBe(true);
            });

            test('uses a default radius if radius is undefined', () => {
                expect(poi.isNear({ latitude: 40, longitude: -121.99 })).toBe(true);
                expect(poi.isNear({ latitude: 40, longitude: -121.9 })).toBe(false);
            });
        });

        describe('when passed multiple zones', (): void => {
            test('returns true if the Poi belongs any of the listed zones, using normalized names', (): void => {
                [
                    ['RED'],
                    ['bright Blue', 'white'],
                    ['yellow', 'Red'],
                ].forEach((zones: string[]): void => {
                    expect(poi.belongsToZone(zones)).toBe(true);
                    expect(poi.belongsToZone(new Set(zones))).toBe(true);
                });
            });

            test('returns false if the Poi does not belong to any of the listed zones, using normalized names', (): void => {
                [
                    ['white'],
                    ['Blue', 'Reddish'],
                    ['Bright Blonde', 'ivory'],
                ].forEach((zones: string[]): void => {
                    expect(poi.belongsToZone(zones)).toBe(false);
                    expect(poi.belongsToZone(new Set(zones))).toBe(false);
                });
            });

            test('throws if any of the supplied zones are invalid', (): void => {
                [
                    ['red', '   '],
                    ['', 'Bright Blue'],
                    ['yellow', undefined],
                ].forEach((zones: (string|undefined)[]): void => {
                    expect((): void => {
                        poi.belongsToZone(zones as string[]);
                    }).toThrowError(/invalid/i);
                });
            });
        });
    });

    describe('normalization', (): void => {
        interface NormalizedTest {
            poi: Poi;
            expected: PoiKeys;
        }
        const expected: NormalizedTest[] = [
            {
                poi: new Poi({
                    name: 'A POI',
                    city: 'Gotham',
                    zones: ['Red', 'wHite'],
                    coord: { latitude: 40.123, longitude: -122.123 },
                }),
                expected: { name: 'apoi', city: 'gotham', 'zones': ['red', 'white'] },
            },
            {
                poi: new Poi({
                    name: 'Another POI',
                    alternateNames: ['elsewhere'],
                    city: 'Metropolis',
                    zones: ['White', 'BLUE'],
                    coord: { latitude: 40.123, longitude: -122.123 },
                }),
                expected: { name: 'anotherpoi', alternateNames: ['elsewhere'], city: 'metropolis', zones: ['white', 'blue'] },
            },
        ];

        describe('normalized method', (): void => {
            test('normalizes all normalizable fields', (): void => {
                expected.forEach((test: NormalizedTest): void => {
                    expect(test.poi.keys).toMatchObject(test.expected);
                });
            });
        });
    });

    describe('getDirectoryOptions static method', (): void => {
        test('searches by name and alternate name and index by alternate names', (): void => {
            expect(Poi.getDirectoryOptions()).toMatchObject({
                textSearchKeys: [
                    { name: 'name' },
                    { name: 'alternateNames' },
                ],
                alternateKeys: ['alternateNames'],
            });
        });
    });

    describe('toString method', () => {
        test('returns the primaryKey of the POI', () => {
            good.forEach((prop) => {
                const poi = new Poi(prop);
                expect(poi.toString()).toMatch(poi.primaryKey);
            });
        });
    });

    describe('toJson method', () => {
        test('constructs a well-formed json object', () => {
            good.forEach((prop) => {
                const poi = new Poi(prop);
                expect(poi.toJson()).toEqual(
                    expect.objectContaining(prop),
                );
            });
        });
    });

    describe('toArray method', () => {
        test('constructs a well-formed array', () => {
            good.forEach((prop) => {
                const poi = new Poi(prop);
                const asArray = poi.toArray();
                expect(asArray).toHaveLength(5);
                expect(asArray[0]).toEqual(poi.zones.join('|'));
                expect(asArray[1]).toEqual(poi.city);
                expect(asArray[2]).toEqual([poi.name, ...poi.alternateNames].join('|'));
                expect(asArray[3]).toEqual(poi.coord.latitude);
                expect(asArray[4]).toEqual(poi.coord.longitude);
            });
        });
    });
});
