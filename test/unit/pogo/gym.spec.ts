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

import '../../helpers/jestHelpers';
import * as GymConverters from '../../../src/pogo/converters/gymConverters';
import { loadJsonFile, saveJsonFile } from '../../../src/utils/jsonHelpers';
import { Gym } from '../../../src/pogo/gym';
import { MockFileSystem } from '../../helpers/dataHelpers';

describe('PoGo Gym module', () => {
    describe('Gym class', () => {
        const good = [
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
        ];

        describe('constructor and create method', () => {
            it('should construct a gym from a valid initializer', () => {
                for (const init of good) {
                    [
                        new Gym(init),
                        Gym.createGym(init).getValueOrDefault(),
                    ].forEach((gym) => {
                        expect(gym).toBeDefined();
                        if (gym !== undefined) {
                            expect(gym.name).toEqual(init.name);
                            expect(gym.alternateNames).toEqual(init.alternateNames ?? []);
                            expect(gym.city).toEqual(init.city);
                            expect(gym.zones).toEqual(init.zones);
                            expect(gym.coord).toEqual(init.coord);
                            expect(gym.isExEligible).toEqual(init.isExEligible);
                        }
                    });
                }
            });
        });

        describe('toString method', () => {
            it('should match primaryKey', () => {
                for (const init of good) {
                    const gym = new Gym(init);
                    expect(gym.toString()).toEqual(gym.primaryKey);
                }
            });
        });
    });

    describe('gymPropertiesFromArray converter', () => {
        const tests = [
            {
                source: ['Zone 1', 'City 1', 'A POI|First POI', '43.210', '-123.456', 'ExEligible'],
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
                source: ['Zone 1|Zone 2', 'City 1', 'A POI|First POI|POI the first', '43.210', '-123.456', 'NonEx'],
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
                source: ['Zone 1|Zone 2', 'City 1', 'A POI', '43.210', '-123.456', 'ExEligible'],
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
        ];

        it('should convert valid arrays', () => {
            tests.forEach((test) => {
                expect(GymConverters.gymPropertiesFromArray.convert(test.source)).toSucceedWith(test.expect);
            });
        });

        it('should round trip through toArray', () => {
            tests.forEach((test) => {
                expect(GymConverters.gym.convert(test.source)).toSucceedWithCallback((gym: Gym) => {
                    expect(GymConverters.gym.convert(gym.toArray())).toSucceedWith(gym);
                });
            });
        });

        it('should round trip through toJson', () => {
            tests.forEach((test) => {
                expect(GymConverters.gym.convert(test.source)).toSucceedWithCallback((gym: Gym) => {
                    const json = gym.toJson();
                    expect(GymConverters.gym.convert(json)).toSucceedWith(gym);
                });
                const gym = GymConverters.gym.convert(test.source).getValueOrThrow();
                const json = gym.toJson();
                const gym2 = GymConverters.gym.convert(json).getValueOrDefault();
                expect(gym).toEqual(gym2);
            });
        });

        it('should fail for an invalid array or non-array', () => {
            [
                { source: ['A too short array'], expect: /must have six columns/i },
                { source: ['An', 'array', 'that', 'is', '2', '2', 'long', 'to', 'use'], expect: /must have six columns/i },
                {
                    source: ['zone', 'city', 'names', 'latitude', 'longitude', 'ExEligible'],
                    expect: /not a number/i,
                },
                {
                    source: ['zone', 'city', 'names', '10', '10', 'exexex'],
                    expect: /invalid ex status/i,
                },
            ].forEach((test) => {
                expect(GymConverters.gymPropertiesFromArray.convert(test.source)).toFailWith(test.expect);
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
                expect(GymConverters.gymPropertiesFromLegacyArray.convert(test.source)).toSucceedWith(test.expect);
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
                expect(GymConverters.gymPropertiesFromLegacyArray.convert(test.source)).toFailWith(test.expect);
            });
        });
    });

    describe('loadLegacyGymsFile function', () => {
        it('should load a valid legacy gyms CSV file', () => {
            expect(GymConverters.loadLegacyGymsFile('./test/unit/pogo/data/legacyGyms.csv')).toSucceedWith(
                expect.arrayContaining([
                    expect.objectContaining({ name: '128th Ave Trail Marker' }),
                    expect.objectContaining({ name: 'Northstar Park' }),
                    expect.objectContaining({ name: 'Sunflowers' }),
                ]),
            );
        });
    });

    describe('save gyms file', () => {
        const mockFs = new MockFileSystem([
            {
                path: 'legacyGyms.csv',
                backingFile: './test/unit/pogo/data/legacyGyms.csv',
                writable: false,
            },
            {
                path: 'gymObjects.json',
                writable: true,
            },
            {
                path: 'gymArrays.json',
                writable: true,
            },
        ]);
        it('should write legacy gyms to a json file as arrays', () => {
            const spies = mockFs.startSpies();

            const gyms = GymConverters.loadLegacyGymsFile('legacyGyms.csv').getValueOrThrow();
            const json = gyms.map((g) => g.toJson());
            expect(saveJsonFile('gymObjects.json', json)).toSucceed();

            const arrays = gyms.map((g) => g.toArray());
            expect(saveJsonFile('gymArrays.json', arrays)).toSucceed();

            const arrayJsonResult = loadJsonFile('gymArrays.json');
            expect(arrayJsonResult).toSucceed();
            const objectJsonResult = loadJsonFile('gymObjects.json');
            expect(objectJsonResult).toSucceed();

            spies.restore();

            // Uncomment to so save updated arrays and objects if legacyGyms change
            // saveJsonFile('./test/unit/pogo/data/gymArrays.json', arrayJsonResult.getValueOrThrow());
            // saveJsonFile('./test/unit/pogo/data/gymObjects.json', objectJsonResult.getValueOrThrow());
        });
    });
});
