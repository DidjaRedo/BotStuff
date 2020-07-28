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
import { Names } from '../../../src/names/names';
import { Zone } from '../../../src/places/zone';

describe('Zone class', () => {
    const validZoneNames = ['Valid Zone Name 2'];
    const invalidZoneNames = ['', '    '];

    describe('constructor', () => {
        test('constructs a zone with a valid name', () => {
            validZoneNames.forEach((name) => {
                let zone: Zone|undefined;
                expect(() => { zone = new Zone(name); }).not.toThrow();
                expect(zone).toBeDefined();
                expect(zone?.name).toBe(name);
                expect(zone?.primaryKey).toBe(Names.normalizeOrThrow(name));
                expect(zone?.keys).toEqual({
                    name: Names.normalizeOrThrow(name),
                });
                expect(zone?.cities.size).toBe(0);
                expect(zone?.pois.size).toBe(0);
            });
        });

        test('throws if a zone name is invalid', () => {
            invalidZoneNames.forEach((name) => {
                let zone;
                expect(() => { zone = new Zone(name); }).toThrowError(/non-empty/i);
                expect(zone).toBeUndefined();
            });
        });
    });

    describe('create static method', () => {
        test('constructs a zone with a valid name', () => {
            validZoneNames.forEach((name) => {
                expect(Zone.create(name)).toSucceedAndSatisfy((zone: Zone) => {
                    expect(zone).toBeDefined();
                    expect(zone.name).toBe(name);
                    expect(zone.primaryKey).toBe(Names.normalizeOrThrow(name));
                    expect(zone.keys).toEqual({
                        name: Names.normalizeOrThrow(name),
                    });
                    expect(zone.cities.size).toBe(0);
                    expect(zone.pois.size).toBe(0);
                });
            });
        });

        test('fails if a zone name is invalid', () => {
            invalidZoneNames.forEach((name) => {
                expect(Zone.create(name)).toFailWith(/invalid zone name/i);
            });
        });
    });

    describe('includesCity method', () => {
        const zoneCities = ['Redmond', 'Redmond Ridge', 'North Redmond'];
        const matching = ['REDMOND', 'red mondridge', 'noRTH REDMOND'];
        const nonMatching = ['Redmond Bridge'];
        const invalid = ['    '];

        const zone = new Zone('Eastside');
        zone.cities.addRange(zoneCities);

        test('matches if this zone includes a city using normalied match', () => {
            expect.assertions(matching.length);
            matching.forEach((c) => expect(zone.includesCity(c)).toBe(true));
        });

        test('matches if this zone does not includes a city using normalized match', () => {
            expect.assertions(nonMatching.length);
            nonMatching.forEach((c) => expect(zone.includesCity(c)).toBe(false));
        });

        test('throws if the city name is invalid', () => {
            expect.assertions(invalid.length);
            for (const c of invalid) {
                expect(() => zone.includesCity(c)).toThrowError(/non-empty/i);
            }
        });
    });

    describe('includesPoi method', () => {
        const zonePois = ['Some Playground', 'Random Memorial Bench', 'Artbox'];
        const matching = ['someplayGROUND', 'RANDOM memorialBench', 'Art Box'];
        const nonMatching = ['Artbox2'];
        const invalid = ['    '];

        const zone = new Zone('Eastside');
        zone.pois.addRange(zonePois);

        test('matches if this zone includes a poi using normalied match', () => {
            expect.assertions(matching.length);
            matching.forEach((c) => expect(zone.includesPoi(c)).toBe(true));
        });

        test('matches if this zone does not includes a POI using normalized match', () => {
            expect.assertions(nonMatching.length);
            nonMatching.forEach((c) => expect(zone.includesPoi(c)).toBe(false));
        });

        test('throws if the POI name is invalid', () => {
            expect.assertions(invalid.length);
            for (const c of invalid) {
                expect(() => zone.includesPoi(c)).toThrowError(/non-empty/i);
            }
        });
    });
});
