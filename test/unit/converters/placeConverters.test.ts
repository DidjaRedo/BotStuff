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
import * as PlaceConverters from '../../../src/converters';

import { City, GlobalPoiDirectory, Poi, PoiProperties, Zone } from '../../../src/places';
import { Names } from '../../../src/names';

describe('PlaceConverters module', () => {
    const poiInit: PoiProperties[] = [
        {
            name: 'Eiffel Tower',
            city: 'Paris',
            zones: ['France', 'Euro'],
            coord: { latitude: 48.858242, longitude: 2.2949378 },
        },
        {
            name: 'Big Ben',
            city: 'London',
            zones: ['UK', 'Not Euro'],
            coord: { latitude: 51.50072, longitude: -0.12462105 },
        },
        {
            name: 'Magere Brug',
            city: 'Amsterdam',
            zones: ['Netherlands', 'Euro', 'Benelux'],
            coord: { latitude: 52.363586, longitude: 48.902396 },
        },
        {
            name: 'Empire State Building',
            city: 'New York City',
            zones: ['United States', 'New York'],
            coord: { latitude: 40.748441, longitude: -73.985664 },
        },
    ];
    const pois = new GlobalPoiDirectory<Poi>({}, poiInit.map((p) => Poi.createPoi(p).getValueOrThrow()));

    describe('cityFromString converter', () => {
        const converter = PlaceConverters.cityFromString(pois);

        test('retrieves a city by exact normalized name match', () => {
            for (const name of ['paris', 'AMSTERDAM', 'newyork City']) {
                expect(converter.convert(name)).toSucceedAndSatisfy((city: City) => {
                    expect(city.primaryKey).toEqual(Names.normalizeOrThrow(name));
                });
            }
        });

        test('fails for an unknown city', () => {
            for (const name of ['Narnia', 'Hamsterdam', 'Paree']) {
                expect(converter.convert(name)).toFailWith(/does not exist/i);
            }
        });

        test('fails for a non-string', () => {
            [
                undefined,
                ['Amsterdam'],
                () => 'london',
                { city: 'new York city' },
                0,
                true,
            ].forEach((value) => {
                expect(converter.convert(value)).toFailWith(/cannot convert non-string/i);
            });
        });
    });

    describe('cities converter', () => {
        const converter = PlaceConverters.cities(pois);

        test('retrieves a list of cities by exact normalized name match from a comma-separated string', () => {
            expect(converter.convert('paris, AMSTERDAM, newYork CITY')).toSucceedWith([
                expect.objectContaining({ primaryKey: 'paris' }),
                expect.objectContaining({ primaryKey: 'amsterdam' }),
                expect.objectContaining({ primaryKey: 'newyorkcity' }),
            ]);
        });

        test('retrieves a list of cities by exact normalized name match from an array of strings', () => {
            expect(converter.convert(['paris', 'AMSTERDAM', 'newYork CITY'])).toSucceedWith([
                expect.objectContaining({ primaryKey: 'paris' }),
                expect.objectContaining({ primaryKey: 'amsterdam' }),
                expect.objectContaining({ primaryKey: 'newyorkcity' }),
            ]);
        });

        test('fails for a comma-separated string containing an unknown city', () => {
            expect(converter.convert('Amsterdam, Paris, Narnia')).toFailWith(/narnia does not exist/i);
        });

        test('fails for an array of strings containing an unknown city', () => {
            expect(converter.convert(['Amsterdam', 'Paris', 'Narnia'])).toFailWith(/narnia does not exist/i);
        });

        test('fails for an array containing a non-string', () => {
            expect(converter.convert(['Paris', () => 'Amsterdam'])).toFailWith(/cannot convert non-string.*to city/i);
        });

        test('fails for anything other than a string or array of strings', () => {
            [
                undefined,
                () => ['london'],
                { cities: ['new York city'] },
                0,
                true,
            ].forEach((value) => {
                expect(converter.convert(value)).toFailWith(/cannot convert.*to list of cities/i);
            });
        });
    });

    describe('zoneFromString converter', () => {
        const converter = PlaceConverters.zoneFromString(pois);

        test('retrieves a zone by exact normalized name match', () => {
            for (const name of ['france', 'UnitedStates', 'NOT euro']) {
                expect(converter.convert(name)).toSucceedAndSatisfy((zone: Zone) => {
                    expect(zone.primaryKey).toEqual(Names.normalizeOrThrow(name));
                });
            }
        });

        test('fails for an unknown zone', () => {
            for (const name of ['Washington', 'Iberia', 'Latam']) {
                expect(converter.convert(name)).toFailWith(/does not exist/i);
            }
        });

        test('fails for a non-string', () => {
            [
                undefined,
                ['Baltics'],
                () => 'united states',
                { zone: 'Netherlands' },
                0,
                true,
            ].forEach((value) => {
                expect(converter.convert(value)).toFailWith(/cannot convert non-string/i);
            });
        });
    });

    describe('zones converter', () => {
        const converter = PlaceConverters.zones(pois);

        test('retrieves a list of zones by exact normalized name match from a comma-separated string', () => {
            expect(converter.convert('uk, new york, benelux')).toSucceedWith([
                expect.objectContaining({ primaryKey: 'uk' }),
                expect.objectContaining({ primaryKey: 'newyork' }),
                expect.objectContaining({ primaryKey: 'benelux' }),
            ]);
        });

        test('retrieves a list of zones by exact normalized name match from an array of strings', () => {
            expect(converter.convert(['uk', 'netherlands', 'UNITEDstates'])).toSucceedWith([
                expect.objectContaining({ primaryKey: 'uk' }),
                expect.objectContaining({ primaryKey: 'netherlands' }),
                expect.objectContaining({ primaryKey: 'unitedstates' }),
            ]);
        });

        test('fails for a comma-separated string containing an unknown zone', () => {
            expect(converter.convert('NOT Euro, Benelux, Middle earth')).toFailWith(/middle earth does not exist/i);
        });

        test('fails for an array of strings containing an unknown zone', () => {
            expect(converter.convert(['United States', 'New York', 'Hogwarts'])).toFailWith(/hogwarts does not exist/i);
        });

        test('fails for an array containing a non-string', () => {
            expect(converter.convert(['United States', true])).toFailWith(/cannot convert non-string.*to zone/i);
        });

        test('fails for anything other than a string or array of strings', () => {
            [
                undefined,
                () => ['UK'],
                { cities: ['Not Euro'] },
                0,
                true,
            ].forEach((value) => {
                expect(converter.convert(value)).toFailWith(/cannot convert.*to list of zones/i);
            });
        });
    });

    describe('places converter', () => {
        const converter = PlaceConverters.places(pois);

        test('retrieves a list of places by exact normalized name match from a comma-separated string', () => {
            expect(converter.convert('uk, new york, new york city, benelux, paris')).toSucceedWith({
                cities: [
                    expect.objectContaining({ primaryKey: 'newyorkcity' }),
                    expect.objectContaining({ primaryKey: 'paris' }),
                ],
                zones: [
                    expect.objectContaining({ primaryKey: 'uk' }),
                    expect.objectContaining({ primaryKey: 'newyork' }),
                    expect.objectContaining({ primaryKey: 'benelux' }),
                ],
            });
        });

        test('retrieves a list of places by exact normalized name match from an array of strings', () => {
            expect(converter.convert(['uk', 'LonDon', 'netherlands', 'UNITEDstates', 'AMSTERDAM'])).toSucceedWith({
                cities: [
                    expect.objectContaining({ primaryKey: 'london' }),
                    expect.objectContaining({ primaryKey: 'amsterdam' }),
                ],
                zones: [
                    expect.objectContaining({ primaryKey: 'uk' }),
                    expect.objectContaining({ primaryKey: 'netherlands' }),
                    expect.objectContaining({ primaryKey: 'unitedstates' }),
                ],
            });
        });

        test('fails for a comma-separated string containing an unknown city or zone', () => {
            expect(converter.convert('NOT Euro, Amsterdam, Benelux, Middle earth'))
                .toFailWith(/middle earth.*is not a city or zone/i);
        });

        test('fails for an array of strings containing an unknown zone', () => {
            expect(converter.convert(['United States', 'Paris', 'New York', 'Hogwarts', 'London']))
                .toFailWith(/hogwarts.*is not a city or zone/i);
        });

        test('fails for an array containing a non-string', () => {
            expect(converter.convert(['Amsterdam', 10])).toFailWith(/cannot convert non-string.*to place/i);
        });

        test('fails for anything other than a string or array of strings', () => {
            [
                undefined,
                () => ['UK'],
                { cities: ['Amsterdam'] },
                0,
                true,
            ].forEach((value) => {
                expect(converter.convert(value)).toFailWith(/cannot convert.*to list of places/i);
            });
        });
    });
});

