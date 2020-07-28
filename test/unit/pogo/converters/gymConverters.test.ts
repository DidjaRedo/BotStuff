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
import * as GymConverters from '../../../../src/pogo/converters';
import { ExtendedArray, succeed } from '@fgv/ts-utils';
import { GlobalGymDirectory, Gym } from '../../../../src/pogo';
import { bestGymByName, gymsByName, singleGymByName } from '../../../../src/pogo/converters';
import { readJsonFileSync, writeJsonFileSync } from '@fgv/ts-utils/jsonHelpers';

import { MockFileSystem } from '../../../helpers/dataHelpers';
import { TestRaidManager } from '../../../helpers/pogoHelpers';

describe('Pogo GymConverters module', () => {
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

        test('converts valid arrays', () => {
            tests.forEach((test) => {
                expect(GymConverters.gymPropertiesFromArray.convert(test.source)).toSucceedWith(test.expect);
            });
        });

        test('round-trips through toArray', () => {
            tests.forEach((test) => {
                expect(GymConverters.gym.convert(test.source)).toSucceedAndSatisfy((gym: Gym) => {
                    expect(GymConverters.gym.convert(gym.toArray())).toSucceedWith(gym);
                });
            });
        });

        test('round-trips through toJson', () => {
            tests.forEach((test) => {
                expect(GymConverters.gym.convert(test.source)).toSucceedAndSatisfy((gym: Gym) => {
                    const json = gym.toJson();
                    expect(GymConverters.gym.convert(json)).toSucceedWith(gym);
                });
                const gym = GymConverters.gym.convert(test.source).getValueOrThrow();
                const json = gym.toJson();
                const gym2 = GymConverters.gym.convert(json).getValueOrDefault();
                expect(gym).toEqual(gym2);
            });
        });

        test('fails for an invalid array or non-array', () => {
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
        test('converts valid arrays', () => {
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

        test('fails for an invalid array or non-array', () => {
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

    describe('singleGymByName', () => {
        const { rm } = TestRaidManager.setup([]);

        describe('with no options or filter', () => {
            const converter = singleGymByName(rm.gyms);

            test('succeeds for a single valid gym', () => {
                expect(converter.convert('prescott')).toSucceedWith(
                    rm.gyms.lookupExact('prescottcommunitypark').singleItem().getValueOrThrow(),
                );
            });

            test('fails for an ambiguous gym', () => {
                expect(converter.convert('starbucks')).toFailWith(/matches 8 items/i);
            });

            test('fails for an unknown gym', () => {
                expect(converter.convert('hogwarts')).toFailWith(/not found/i);
            });

            test('fails for a non-string', () => {
                expect(converter.convert(['hogwarts'])).toFailWith(/must be a string/i);
            });
        });

        test('applies options if supplied', () => {
            const converterWithOptions = singleGymByName(rm.gyms, { exFilter: 'nonEx' });
            expect(converterWithOptions.convert('starbucks')).toFailWith(/matches 2 items/i);

            expect(converterWithOptions.convert('bear creek')).toSucceedWith(
                rm.gyms.lookupExact('bearcreekcrossing').singleItem().getValueOrThrow(),
            );
        });
    });

    describe('bestGymByName', () => {
        const { rm } = TestRaidManager.setup([]);
        describe('with no options or filter', () => {
            const converter = bestGymByName(rm.gyms);

            test('succeeds for a single valid gym', () => {
                expect(converter.convert('painted')).toSucceedWith(
                    rm.gyms.lookupExact('paintedparkinglot').singleItem().getValueOrThrow(),
                );
            });

            test('gets the best match for an ambiguous gym', () => {
                expect(converter.convert('starbucks')).toSucceedWith(
                    rm.gyms.lookupExact('starbucksfirststore').singleItem().getValueOrThrow(),
                );
            });

            test('fails for an unknown gym', () => {
                expect(converter.convert('mordor')).toFailWith(/not found/i);
            });
            test('fails for a non-string', () => {
                expect(converter.convert(['mordor'])).toFailWith(/must be a string/i);
            });
        });

        test('applies options if supplied', () => {
            const converterWithOptions = bestGymByName(rm.gyms, { exFilter: 'exEligible' });
            expect(converterWithOptions.convert('starbucks')).toSucceedWith(
                rm.gyms.lookupExact('juanitavillagestarbucks').singleItem().getValueOrThrow(),
            );
        });
    });

    describe('gymsByName', () => {
        const { rm } = TestRaidManager.setup([]);
        describe('with no options or filter', () => {
            const converter = gymsByName(rm.gyms);

            test('succeeds for a single valid GYM', () => {
                expect(converter.convert('jillyann')).toSucceedWith(expect.arrayContaining([
                    rm.gyms.lookupExact('brookejillyannbennettepark').singleItem().getValueOrThrow(),
                ]));
            });

            test('gets all matches for an ambiguous gym', () => {
                expect(converter.convert('park')).toSucceedWith(expect.arrayContaining([
                    rm.gyms.lookupExact('nuthatchtoeastbranchtrail').singleItem().getValueOrThrow(),
                    rm.gyms.lookupExact('parkplaceclock').singleItem().getValueOrThrow(),
                ]));
            });

            test('fails for an unknown gym', () => {
                expect(converter.convert('neverland')).toSucceedAndSatisfy((gyms: ExtendedArray<Gym>) => {
                    expect(gyms).toHaveLength(0);
                });
            });

            test('fails for a non-string', () => {
                expect(converter.convert(['pointy-haired'])).toFailWith(/must be a string/i);
            });
        });

        test('applies options if supplied', () => {
            const converterWithOptions = gymsByName(rm.gyms, { exFilter: 'nonEx' });
            expect(converterWithOptions.convert('northstar')).toSucceedAndSatisfy((gyms: ExtendedArray<Gym>) => {
                expect(gyms).toHaveLength(0);
            });

            expect(converterWithOptions.convert('starbucks')).toSucceedWith(expect.arrayContaining([
                rm.gyms.lookupExact('starbucksfirststore').singleItem().getValueOrThrow(),
                rm.gyms.lookupExact('bellevuestarbucks').singleItem().getValueOrThrow(),
            ]));
        });
    });

    describe('globalGymDirectory converters', () => {
        test('loads a valid list of arrays or objects', () => {
            let dir1: GlobalGymDirectory|undefined;
            let dir2: GlobalGymDirectory|undefined;
            expect(GymConverters.loadGlobalGymDirectorySync('./test/unit/pogo/data/gymArrays.json')
                .onSuccess((dir) => {
                    dir1 = dir;
                    return succeed(dir);
                }),
            ).toSucceed();
            expect(GymConverters.loadGlobalGymDirectorySync('./test/unit/pogo/data/gymObjects.json')
                .onSuccess((dir) => {
                    dir2 = dir;
                    return succeed(dir);
                }),
            ).toSucceed();

            // just directly comparing dir2 & dir1 works but when the comparison fails
            // it gives an unhelpful error (entries called on incompatible receiver),
            // presumably when trying to generate the diff.  Comparing pois, cities
            // and zones directly seems to work fine.
            // expect(dir2).toEqual(dir1)
            expect(dir2?.pois).toEqual(dir1?.pois);
            expect(dir2?.cities).toEqual(dir1?.cities);
            expect(dir2?.zones).toEqual(dir1?.zones);
        });
    });

    describe('loadLegacyGymsFile function', () => {
        test('loads a valid legacy gyms CSV file', () => {
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
        test('writes legacy gyms to a json file as arrays', () => {
            const spies = mockFs.startSpies();

            const gyms = GymConverters.loadLegacyGymsFile('legacyGyms.csv').getValueOrThrow();
            const json = gyms.map((g) => g.toJson());
            expect(writeJsonFileSync('gymObjects.json', json)).toSucceed();

            const arrays = gyms.map((g) => g.toArray());
            expect(writeJsonFileSync('gymArrays.json', arrays)).toSucceed();

            const arrayJsonResult = readJsonFileSync('gymArrays.json');
            expect(arrayJsonResult).toSucceed();
            const objectJsonResult = readJsonFileSync('gymObjects.json');
            expect(objectJsonResult).toSucceed();

            spies.restore();

            // Uncomment to so save updated arrays and objects if legacyGyms change
            // saveJsonFile('./test/unit/pogo/data/gymArrays.json', arrayJsonResult.getValueOrThrow());
            // saveJsonFile('./test/unit/pogo/data/gymObjects.json', objectJsonResult.getValueOrThrow());
        });
    });
});
