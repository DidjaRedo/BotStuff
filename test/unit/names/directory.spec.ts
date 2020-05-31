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
import { DirectoryLookupOptions, FieldSearchWeight } from '../../../src/names/directory';
import { FakeKeyedThing, FakeKeys, FakeKtDirectory, FakeProps } from '../../helpers/fakeKeyedThing';
import { Names } from '../../../src/names/names';

describe('Directory class', (): void => {
    const noAlternateKeyOptions: DirectoryLookupOptions<FakeKeyedThing, FakeProps, FakeKeys> = {
        threshold: 0.2,
        textSearchKeys: [
            { name: 'name', weight: 0.5 },
            { name: 'alternateName', weight: 0.3 },
            { name: 'aliases', weight: 0.2 },
        ],
    };
    const uniqueAlternateNameOptions: DirectoryLookupOptions<FakeKeyedThing, FakeProps, FakeKeys> = {
        ...noAlternateKeyOptions,
        alternateKeys: ['alternateName'],
        enforceAlternateKeyUniqueness: ['alternateName'],
    };
    const ambiguousAlternateNameOptions: DirectoryLookupOptions<FakeKeyedThing, FakeProps, FakeKeys> = {
        ...noAlternateKeyOptions,
        alternateKeys: ['alternateName'],
    };
    const uniqueAliasOptions: DirectoryLookupOptions<FakeKeyedThing, FakeProps, FakeKeys> = {
        ...noAlternateKeyOptions,
        alternateKeys: ['aliases'],
        enforceAlternateKeyUniqueness: ['aliases'],
    };
    const ambiguousAliasOptions: DirectoryLookupOptions<FakeKeyedThing, FakeProps, FakeKeys> = {
        ...noAlternateKeyOptions,
        alternateKeys: ['aliases'],
    };

    const init: FakeProps[] = [
        { name: 'First Place', alternateName: 'Start', aliases: ['Hipsters', 'Coffee'], city: 'Seattle', state: 'Washington', isSpecial: true, externalId: 'Origin' },
        { name: 'Second Place', alternateName: 'Middle', city: 'Denver', state: 'Colorado', isSpecial: true, externalId: 'MileHigh' },
        { name: 'Third Place', alternateName: 'End', aliases: ['Big Apple'], city: 'New York', state: 'New York', isSpecial: false },
    ];

    const initThings = init.map((i) => new FakeKeyedThing(i));

    type ThingIndexer = (field: keyof FakeKeys|null, value: string, elem: FakeProps) => void;
    function forEachAlternateKey(things: Iterable<FakeProps>, alternateKeys: (keyof FakeKeys)[], cb: ThingIndexer): void {
        for (const thing of things) {
            cb(null, thing.name, thing);
            if (alternateKeys) {
                alternateKeys.forEach((ak): void => {
                    let values = thing[ak];
                    if (values !== undefined) {
                        values = (Array.isArray(values) ? values : [values]);
                        values.forEach((v): void => {
                            cb(ak, v, thing);
                        });
                    }
                });
            }
        };
    }

    type ThingSearcher = (field: keyof FakeProps, value: string, weight: number, elem: FakeProps) => void;
    function forEachSearchableString(things: Iterable<FakeProps>, keys: FieldSearchWeight<FakeProps>[], cb: ThingSearcher): void {
        for (const thing of things) {
            for (const key of keys) {
                let v = thing[key.name];
                if (typeof v === 'string') {
                    v = [v];
                }
                else if (!Array.isArray(v)) {
                    continue;
                }

                v.forEach((s): void => {
                    cb(key.name, s, key.weight, thing);
                });
            }
        }
    }

    describe('constructor', (): void => {
        it('should construct with initializers', (): void => {
            const dir = new FakeKtDirectory(noAlternateKeyOptions, initThings);
            expect(dir).toBeDefined();
            expect(dir.size).toBe(init.length);
        });

        it('should construct without initializers', (): void => {
            const dir = new FakeKtDirectory(noAlternateKeyOptions);
            expect(dir).toBeDefined();
            expect(dir.size).toBe(0);
        });

        it('should index all elements of an array of strings as alternate key', () => {
            const dir = new FakeKtDirectory(uniqueAliasOptions, initThings);
            const elem = dir.getByAnyFieldExact('hipsters');
            expect(elem).toHaveLength(1);
        });
    });

    describe('add method', (): void => {
        it("should add a new element that doesn't conflict", (): void => {
            const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
            const elem = { name: 'Fourth Place', alternateName: 'Past the End', city: 'Bangor', state: 'Maine' };
            dir.add(new FakeKeyedThing(elem));
            expect(dir.size).toBe(init.length + 1);
            expect(dir.get(elem.name)).toMatchObject(elem);
        });

        it('should add elements to the search index', (): void => {
            const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
            const elem = { name: 'Fourth Place', alternateName: 'Past the End', city: 'Bangor', state: 'Maine' };

            dir.add(new FakeKeyedThing(elem));

            [elem.name, elem.alternateName].forEach((name): void => {
                const part = name.split(' ')[0].toLowerCase();
                const matches = dir.lookup(part);
                expect(matches.length).toBeGreaterThan(0);
                expect(matches[0].item).toMatchObject(elem);
            });
        });

        it('should throw if an element name conflicts', (): void => {
            const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
            const elem = { name: init[0].name, alternateName: 'Past the End', city: 'Bangor', state: 'Maine' };
            expect((): void => {
                dir.add(new FakeKeyedThing(elem));
            }).toThrowError(/duplicate/i);
        });

        it('should throw if another unique indexed property conflicts', (): void => {
            const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
            const elem = { name: 'Fourth Place', alternateName: init[0].alternateName, city: 'Bangor', state: 'Maine' };
            expect((): void => {
                dir.add(new FakeKeyedThing(elem));
            }).toThrowError(/duplicate/i);
        });

        it('should succeed if an ambiguous indexed property conflicts', () => {
            const dir = new FakeKtDirectory(ambiguousAlternateNameOptions, initThings);
            const elem = { name: 'Fourth Place', alternateName: init[0].alternateName, city: 'Bangor', state: 'Maine' };
            expect((): void => {
                dir.add(new FakeKeyedThing(elem));
            }).not.toThrowError(/duplicate/i);
            const results = dir.getByFieldExact('alternateName', init[0].alternateName);
            expect(results).toHaveLength(2);
        });

        it('should throw if any value of an array unique alternate key conflicts', () => {
            const dir = new FakeKtDirectory(uniqueAliasOptions, initThings);
            const elem = {
                name: 'Fourth Place',
                alternateName: 'Big Apple',
                aliases: ['hipsters'],
                city: 'New York',
                state: 'New York',
            };
            expect((): void => {
                dir.add(new FakeKeyedThing(elem));
            }).toThrowError(/duplicate/i);
        });

        it('should succeed if any value of an array ambiguous alternate key conflicts', () => {
            const dir = new FakeKtDirectory(ambiguousAliasOptions, initThings);
            const elem = {
                name: 'Fourth Place',
                alternateName: 'Big Apple',
                aliases: ['hipsters'],
                city: 'New York',
                state: 'New York',
            };
            expect((): void => {
                dir.add(new FakeKeyedThing(elem));
            }).not.toThrowError(/duplicate/i);
            const results = dir.getByFieldExact('aliases', 'hipsters');
            expect(results).toHaveLength(2);
        });
    });

    describe('addRange method', (): void => {
        const goodInit: FakeProps[] = [
            { name: 'Fourth Place', alternateName: 'Top', aliases: ['Salmon', 'Moose'], city: 'Anchorage', state: 'Alaska', isSpecial: false, externalId: 'whatever' },
            { name: 'Fifth Place', alternateName: 'Center', city: 'St Louis', state: 'Missouri', isSpecial: false, externalId: 'whatever' },
            { name: 'Sixth Place', alternateName: 'Bottom', aliases: ['Disneyworld'], city: 'Orlando', state: 'Florida', isSpecial: false },
        ];
        it('should add all elements of a range if there are no conflicts', (): void => {
            const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
            dir.addRange(goodInit.map((i) => new FakeKeyedThing(i)));
            expect(dir.size).toBe(init.length + goodInit.length);
            [init, goodInit].forEach((group): void => {
                forEachAlternateKey(group, dir.alternateKeys, (key: keyof FakeKeys|null, value: string, elem: FakeKeyedThing): void => {
                    if (key === null) {
                        expect(dir.get(value)).toMatchObject(elem);
                    }
                    else {
                        const results = dir.getByFieldExact(key, value);
                        expect(results).toHaveLength(1);
                        expect(results[0]).toMatchObject(elem);
                    }
                });
            });
        });

        function checkKeyCorrectness(dir: FakeKtDirectory, present: FakeProps[], missing: FakeProps[]): void {
            expect(dir.size).toBe(present.length);
            forEachAlternateKey(present, dir.alternateKeys, (key: keyof FakeKeys|null, value: string, elem: FakeKeyedThing): void => {
                if (key === null) {
                    expect(dir.get(value)).toMatchObject(elem);
                }
                else {
                    const results = dir.getByFieldExact(key, value);
                    expect(results).toEqual(expect.arrayContaining([expect.objectContaining(elem)]));
                }
            });

            forEachAlternateKey(missing, dir.alternateKeys, (key: keyof FakeKeys|null, value: string, elem: FakeKeyedThing): void => {
                if (key === null) {
                    expect(dir.get(value)).not.toBe(elem);
                }
                else {
                    const results = dir.getByFieldExact(key, value);
                    expect(results).not.toContain(elem);
                }
            });
        }

        function checkSearchCorrectness(
            dir: FakeKtDirectory,
            keys: FieldSearchWeight<FakeProps>[],
            present: FakeProps[],
            missing: FakeProps[]
        ): void {
            expect(dir.size).toBe(present.length);

            forEachSearchableString(present, keys, (__: keyof FakeKeyedThing, value: string, ___: number, elem: FakeProps): void => {
                const results = dir.lookup(value);
                expect(results.length).toBeGreaterThan(0);
                let found = false;
                for (const result of results) {
                    found = found || (result.item.primaryKey === Names.normalizeOrThrow(elem.name));
                }
                expect(found).toBe(true);
            });

            forEachSearchableString(missing, keys, (__: keyof FakeKeyedThing, value: string, ___: number, elem: FakeProps): void => {
                const results = dir.lookup(value);
                // no results is a pass
                if (results && (results.length > 0)) {
                    for (const result of results) {
                        expect(result.item).not.toMatchObject(elem);
                    }
                }
            });
        }

        describe('if a name conflicts with existing values', (): void => {
            const badInit: FakeProps[] = [
                { name: 'Fourth Place', alternateName: 'Top', aliases: ['Salmon', 'Moose'], city: 'Anchorage', state: 'Alaska', isSpecial: false, externalId: 'whatever' },
                { name: 'Fifth Place', alternateName: 'Center', city: 'St Louis', state: 'Missouri', isSpecial: false, externalId: 'whatever' },
                { name: 'First Place', alternateName: 'Bottom', aliases: ['Disneyworld'], city: 'Orlando', state: 'Florida', isSpecial: false },
            ];
            it('should throw on addRange', (): void => {
                const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/^duplicate entries/i);
            });

            it('should not add any elements by name or any alternate key', (): void => {
                const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/^duplicate entries/i);

                checkKeyCorrectness(dir, init, badInit);
            });

            it('should not add any elements to the search index', (): void => {
                const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/^duplicate entries/i);

                checkSearchCorrectness(dir, uniqueAlternateNameOptions.textSearchKeys, init, badInit);
            });

            it('should throw if any value of a unique array alternate key conflicts', () => {
                const dir = new FakeKtDirectory(uniqueAliasOptions, initThings);
                const conflictingInit: FakeProps[] = [
                    {
                        name: 'Fourth Place',
                        alternateName: 'Lone Star',
                        aliases: ['cowboys'],
                        city: 'Dallas',
                        state: 'Texas',
                    },
                    {
                        name: 'Fifth Place',
                        alternateName: 'Big Sky',
                        aliases: ['cowboys'],
                        city: 'Butte',
                        state: 'Montana',
                    },
                ];
                expect((): void => {
                    dir.addRange(conflictingInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/duplicate/i);

                checkKeyCorrectness(dir, init, conflictingInit);
                checkSearchCorrectness(dir, uniqueAlternateNameOptions.textSearchKeys, init, conflictingInit);
            });

            it('should succeed if any value of an ambiguous array alternate key conflicts', () => {
                const dir = new FakeKtDirectory(ambiguousAliasOptions, initThings);
                const conflictingInit: FakeProps[] = [
                    {
                        name: 'Fourth Place',
                        alternateName: 'Lone Star',
                        aliases: ['cowboys'],
                        city: 'Dallas',
                        state: 'Texas',
                    },
                    {
                        name: 'Fifth Place',
                        alternateName: 'Big Sky',
                        aliases: ['cowboys'],
                        city: 'Butte',
                        state: 'Montana',
                    },
                    {
                        name: 'Sixth Place',
                        alternateName: 'OK Corral',
                        aliases: ['cowboys'],
                        city: 'Tombstone',
                        state: 'Arizona',
                    },
                ];
                expect((): void => {
                    dir.addRange(conflictingInit.map((i) => new FakeKeyedThing(i)));
                }).not.toThrowError(/duplicate/i);
                const results = dir.getByFieldExact('aliases', 'cowboys');
                expect(results).toHaveLength(3);

                checkKeyCorrectness(dir, [...init, ...conflictingInit], []);
                checkSearchCorrectness(dir, uniqueAlternateNameOptions.textSearchKeys, [...init, ...conflictingInit], []);
            });
        });

        describe('if a name conflicts with other values to be added', (): void => {
            const badInit: FakeProps[] = [
                { name: 'Fourth Place', alternateName: 'Top', aliases: ['Salmon', 'Moose'], city: 'Anchorage', state: 'Alaska', isSpecial: false, externalId: 'whatever' },
                { name: 'Fifth Place', alternateName: 'Center', city: 'St Louis', state: 'Missouri', isSpecial: false, externalId: 'whatever' },
                { name: 'Sixth Place', alternateName: 'Bottom', aliases: ['Disneyworld'], city: 'Orlando', state: 'Florida', isSpecial: false },
                { name: 'Fourth Place', alternateName: 'Way Below', aliases: ['Barbecue'], city: 'Austin', state: 'Texas', isSpecial: false, externalId: 'whatever' },
            ];

            it('should throw on add', (): void => {
                const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);
            });

            it('should not add any elements by name or any alternate key', (): void => {
                const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);

                checkKeyCorrectness(dir, init, badInit);
            });

            it('should not add any elements to the search index', (): void => {
                const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);

                checkSearchCorrectness(dir, uniqueAlternateNameOptions.textSearchKeys, init, badInit);
            });
        });

        describe('if an alternate key conflicts with other values to be added', (): void => {
            const badInit: FakeProps[] = [
                { name: 'Fourth Place', alternateName: 'Top', aliases: ['Salmon', 'Moose'], city: 'Anchorage', state: 'Alaska', isSpecial: false, externalId: 'whatever' },
                { name: 'Fifth Place', alternateName: 'Center', city: 'St Louis', state: 'Missouri', isSpecial: false, externalId: 'whatever' },
                { name: 'Sixth Place', alternateName: 'Bottom', aliases: ['Disneyworld'], city: 'Orlando', state: 'Florida', isSpecial: false },
                { name: 'Seventh Place', alternateName: 'Bottom', aliases: ['Barbecue'], city: 'Austin', state: 'Texas', isSpecial: false, externalId: 'whatever' },
            ];

            it('should throw on add', (): void => {
                const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);
            });

            it('should not add any elements by name or any alternate key', (): void => {
                const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);

                checkKeyCorrectness(dir, init, badInit);
            });

            it('should not add any elements to the search index', (): void => {
                const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);

                checkSearchCorrectness(dir, uniqueAlternateNameOptions.textSearchKeys, init, badInit);
            });
        });
    });

    describe('keys property', (): void => {
        it('should include all of the keys', (): void => {
            const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
            const keys = dir.keys;

            expect(keys.length).toBe(init.length);
            keys.forEach((k): void => {
                let found = false;
                init.forEach((i): void => {
                    found = found || (Names.normalizeOrThrow(i.name) === k);
                });
                expect(found).toBe(true);
            });

            init.forEach((i): void => {
                expect(keys).toContain(Names.normalizeOrThrow(i.name));
            });
        });
    });

    describe('alternate keys', () => {
        const altKeysDir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
        const noAltKeysDir = new FakeKtDirectory(noAlternateKeyOptions, initThings);

        describe('isAlternateKey method', () => {
            it('should return true for a valid alternate key', () => {
                for (const altKey of uniqueAlternateNameOptions.alternateKeys) {
                    expect(altKeysDir.isAlternateKey(altKey)).toBe(true);
                }
            });

            it('should return false for a invalid alternate key', () => {
                for (const altKey of uniqueAlternateNameOptions.alternateKeys) {
                    expect(noAltKeysDir.isAlternateKey(altKey)).toBe(false);
                }

                const notAltKeys: (keyof FakeKeys)[] = ['name', 'state', 'aliases'];
                for (const notAltKey of notAltKeys) {
                    expect(altKeysDir.isAlternateKey(notAltKey)).toBe(false);
                }
            });
        });

        describe('alternateKeys property', () => {
            it('should return an array with any alternate keys', () => {
                expect(altKeysDir.alternateKeys).toEqual(uniqueAlternateNameOptions.alternateKeys);
            });

            it('should return an empty array if there are no alternate keys', () => {
                expect(noAltKeysDir.alternateKeys).toEqual([]);
            });
        });
    });

    describe('forEach method', (): void => {
        it('should enumerate all of the items', (): void => {
            const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
            const found = [];
            dir.forEach((fp: FakeKeyedThing): void => {
                expect(initThings).toContain(fp);
                found.push(fp);
            });

            initThings.forEach((i): void => {
                expect(found).toContain(i);
            });
        });
    });

    describe('getKeys method', (): void => {
        it('should return the normalized keys for an element in the directory', (): void => {
            const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
            const kt = dir.get(init[0].name);
            expect(dir.getKeys(kt)).toEqual(kt.keys);
        });

        it('should return undefined for an element not in the directory', (): void => {
            const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
            const elem = new FakeKeyedThing({ name: 'Fourth Place', alternateName: init[0].alternateName, city: 'Bangor', state: 'Maine' });
            expect(dir.getKeys(elem)).toBeUndefined();
        });

        it('should throw if the directory contains a different object with the same name', (): void => {
            const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
            const elem = new FakeKeyedThing(init[0]);
            expect((): void => {
                dir.getKeys(elem);
            }).toThrowError(/does not match/i);
        });
    });

    describe('get method', (): void => {
        it('should get an item by name', (): void => {
            const dir = new FakeKtDirectory(noAlternateKeyOptions, initThings);
            init.forEach((i): void => {
                const kt = dir.get(i.name);
                expect(kt.primaryKey).toBe(Names.normalizeOrThrow(i.name));
                expect(kt).toMatchObject(i);
            });
        });
    });

    describe('getByFieldExact method', (): void => {
        it('should get an item by the value of a specified field', (): void => {
            const dir = new FakeKtDirectory(uniqueAlternateNameOptions, initThings);
            init.forEach((i): void => {
                if (i.alternateName) {
                    const kts = dir.getByFieldExact('alternateName', i.alternateName);
                    expect(kts).toHaveLength(1);
                    expect(kts[0].keys.alternateName).toBe(Names.normalizeOrThrow(i.alternateName));
                }
            });
        });

        it('should throw if the specified field is not an alternate key', (): void => {
            const dir = new FakeKtDirectory(noAlternateKeyOptions, initThings);
            expect((): void => {
                dir.getByFieldExact('alternateName', init[0].alternateName);
            }).toThrowError(/not an alternate key/i);
        });

        it('should return an empty array if there are no matching items', () => {
            const noAliasInit: FakeProps[] = [
                { name: 'First Place', alternateName: 'Start', city: 'Seattle', state: 'Washington', isSpecial: true, externalId: 'Origin' },
                { name: 'Second Place', alternateName: 'Middle', city: 'Denver', state: 'Colorado', isSpecial: true, externalId: 'MileHigh' },
                { name: 'Third Place', alternateName: 'End', city: 'New York', state: 'New York', isSpecial: false },
            ];
            const dir = new FakeKtDirectory({
                ...noAlternateKeyOptions,
                alternateKeys: ['alternateName', 'aliases'],
            }, noAliasInit.map((i) => new FakeKeyedThing(i)));

            expect(dir.getByFieldExact('alternateName', 'Not a name')).toEqual([]);
            expect(dir.getByFieldExact('aliases', 'Not an alias')).toEqual([]);
        });
    });

    describe('getByAnyFieldExact methad', (): void => {
        const ktInit = [
            ...init,
            { name: 'Second and a half Place', alternateName: 'Second Place', city: 'Denver', state: 'Colorado', isSpecial: true, externalId: 'MileHigh' },
        ];
        const dir = new FakeKtDirectory(uniqueAlternateNameOptions, ktInit.map((i) => new FakeKeyedThing(i)));

        it('should get all items matching the normalized value of the primary key or any alternate key', () => {
            const things = dir.getByAnyFieldExact('Second Place');
            expect(things.length).toBe(2);
        });

        it('should return an empty array if nothing matches', () => {
            const things = dir.getByAnyFieldExact('Toronto');
            expect(things.length).toBe(0);
        });

        it('should return an empty array if there are no matching items', () => {
            const noAliasInit: FakeProps[] = [
                { name: 'First Place', alternateName: 'Start', city: 'Seattle', state: 'Washington', isSpecial: true, externalId: 'Origin' },
                { name: 'Second Place', alternateName: 'Middle', city: 'Denver', state: 'Colorado', isSpecial: true, externalId: 'MileHigh' },
                { name: 'Third Place', alternateName: 'End', city: 'New York', state: 'New York', isSpecial: false },
            ];
            const dir = new FakeKtDirectory({
                ...noAlternateKeyOptions,
                alternateKeys: ['alternateName', 'aliases'],
            }, noAliasInit.map((i) => new FakeKeyedThing(i)));

            expect(dir.getByAnyFieldExact('Not a name')).toEqual([]);
        });
    });

    describe('lookup method', (): void => {
        const dir = new FakeKtDirectory(noAlternateKeyOptions, initThings);
        it('should get a scored list of possible matches based on name', (): void => {
            init.forEach((i): void => {
                const partialName = i.name.split(' ');
                const result = dir.lookup(partialName[0]);
                expect(result.length).toBeGreaterThan(0);
                expect(result[0].item).toMatchObject(i);
            });
        });

        it('should get a scored list of possible matches based other indexed properties', (): void => {
            init.forEach((i): void => {
                if (i.alternateName) {
                    const partialName = i.alternateName.split(' ');
                    const result = dir.lookup(partialName[0]);
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].item).toMatchObject(i);
                }

                if (i.aliases) {
                    i.aliases.forEach((a): void => {
                        const partialName = a.split(' ');
                        const result = dir.lookup(partialName[0]);
                        expect(result.length).toBeGreaterThan(0);
                        expect(result[0].item).toMatchObject(i);
                    });
                }
            });
        });

        it('should return an empty array when nothing matches', (): void => {
            expect(dir.lookup('xyzzy')).toHaveLength(0);
        });
    });
});
