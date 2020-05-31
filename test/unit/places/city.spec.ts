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
import { Result, fail } from '../../../src/utils/result';
import { City } from '../../../src/places/city';
import { Names } from '../../../src/names/names';

describe('City class', () => {
    const validCityNames = ['Valid City Name 2'];
    const invalidCityNames = ['', '    '];

    describe('constructor', () => {
        it('should construct a city with a valid name', () => {
            validCityNames.forEach((name) => {
                let city;
                expect(() => { city = new City(name); }).not.toThrow();
                expect(city).toBeDefined();
                expect(city.name).toBe(name);
                expect(city.primaryKey).toBe(Names.normalizeOrThrow(name));
                expect(city.keys).toEqual({
                    name: Names.normalizeOrThrow(name),
                });
                expect(city.zones.size).toBe(0);
                expect(city.pois.size).toBe(0);
            });
        });

        it('should throw if a city name is invalid', () => {
            invalidCityNames.forEach((name) => {
                let city;
                expect(() => { city = new City(name); }).toThrowError(/non-empty/i);
                expect(city).toBeUndefined();
            });
        });
    });

    describe('create static method', () => {
        it('should construct a city with a valid name', () => {
            validCityNames.forEach((name) => {
                let result: Result<City> = fail('BOGUS');
                expect(() => { result = City.create(name); }).not.toThrow();
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    const city = result.value;
                    expect(city).toBeDefined();
                    expect(city.name).toBe(name);
                    expect(city.primaryKey).toBe(Names.normalizeOrThrow(name));
                    expect(city.keys).toEqual({
                        name: Names.normalizeOrThrow(name),
                    });
                    expect(city.zones.size).toBe(0);
                    expect(city.pois.size).toBe(0);
                }
            });
        });

        it('should fail if a zone name is invalid', () => {
            invalidCityNames.forEach((name) => {
                let result: Result<City> = fail('BOGUS');
                expect(() => { result = City.create(name); }).not.toThrow();
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).not.toMatch(/bogus/i);
                }
            });
        });
    });

    describe('isInZone method', () => {
        const cityZones = ['Microsoft Campus', 'Bellevue', 'Grass Lawn Park'];
        const matching = ['microSOFTCampus', '  Bell E Vue', 'Grass lawn PARK'];
        const nonMatching = ['Bellevu'];
        const invalid = ['    '];

        const city = new City('Overlake');
        city.zones.addRange(cityZones);

        it('should match if this zone includes a city using normalied match', () => {
            expect.assertions(matching.length);
            matching.forEach((c) => expect(city.isInZone(c)).toBe(true));
        });

        it('should match if this zone does not includes a city using normalized match', () => {
            expect.assertions(nonMatching.length);
            nonMatching.forEach((c) => expect(city.isInZone(c)).toBe(false));
        });

        it('should throw if the city name is invalid', () => {
            expect.assertions(invalid.length);
            for (const c of invalid) {
                expect(() => city.isInZone(c)).toThrowError(/non-empty/i);
            }
        });
    });

    describe('includesPoi method', () => {
        const zonePois = ['Some Playground', 'Random Memorial Bench', 'Artbox'];
        const matching = ['someplayGROUND', 'RANDOM memorialBench', 'Art Box'];
        const nonMatching = ['Artbox2'];
        const invalid = ['    '];

        const city = new City('Redmond');
        city.pois.addRange(zonePois);

        it('should match if this zone includes a poi using normalied match', () => {
            expect.assertions(matching.length);
            matching.forEach((c) => expect(city.includesPoi(c)).toBe(true));
        });

        it('should match if this zone does not includes a POI using normalized match', () => {
            expect.assertions(nonMatching.length);
            nonMatching.forEach((c) => expect(city.includesPoi(c)).toBe(false));
        });

        it('should throw if the POI name is invalid', () => {
            expect.assertions(invalid.length);
            for (const c of invalid) {
                expect(() => city.includesPoi(c)).toThrowError(/non-empty/i);
            }
        });
    });
});
