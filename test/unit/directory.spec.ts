import { Names } from '../../src/names';
import { Directory, DirectoryLookupOptions, FieldSearchWeight } from '../../src/directory';
import { FakeKeys, FakeKeyedThing, FakeProps } from './fakeKeyedThing';

describe('Directory class', (): void => {
    const noAlternateKeyOptions: DirectoryLookupOptions<FakeKeyedThing, FakeProps, FakeKeys> = {
        threshold: 0.2,
        textSearchKeys: [
            { name: 'name', weight: 0.5 },
            { name: 'alternateName', weight: 0.3 },
            { name: 'aliases', weight: 0.2 },
        ],
    };
    const alternateKeyOptions: DirectoryLookupOptions<FakeKeyedThing, FakeProps, FakeKeys> = {
        threshold: 0.2,
        textSearchKeys: [
            { name: 'name', weight: 0.5 },
            { name: 'alternateName', weight: 0.3 },
            { name: 'aliases', weight: 0.2 },
        ],
        alternateKeys: ['alternateName'],
    };
    const aliasesAsKeyOptions: DirectoryLookupOptions<FakeKeyedThing, FakeProps, FakeKeys> = {
        threshold: 0.2,
        textSearchKeys: [
            { name: 'name', weight: 0.5 },
            { name: 'alternateName', weight: 0.3 },
            { name: 'aliases', weight: 0.2 },
        ],
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
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(noAlternateKeyOptions, initThings);
            expect(dir).toBeDefined();
            expect(dir.size).toBe(init.length);
        });

        it('should construct without initializers', (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(noAlternateKeyOptions);
            expect(dir).toBeDefined();
            expect(dir.size).toBe(0);
        });

        it('should index all elements of an array of strings as alternate key', () => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(aliasesAsKeyOptions, initThings);
            const elem = dir.getByAnyFieldExact('hipsters');
            expect(elem).toHaveLength(1);
        });
    });

    describe('add method', (): void => {
        it("should add a new element that doesn't conflict", (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
            const elem = { name: 'Fourth Place', alternateName: 'Past the End', city: 'Bangor', state: 'Maine' };
            dir.add(new FakeKeyedThing(elem));
            expect(dir.size).toBe(init.length + 1);
            expect(dir.get(elem.name)).toMatchObject(elem);
        });

        it('should add elements to the search index', (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
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
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
            const elem = { name: init[0].name, alternateName: 'Past the End', city: 'Bangor', state: 'Maine' };
            expect((): void => {
                dir.add(new FakeKeyedThing(elem));
            }).toThrowError(/duplicate/i);
        });

        it('should throw if another indexed property conflicts', (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
            const elem = { name: 'Fourth Place', alternateName: init[0].alternateName, city: 'Bangor', state: 'Maine' };
            expect((): void => {
                dir.add(new FakeKeyedThing(elem));
            }).toThrowError(/duplicate/i);
        });

        it('should throw if any value of an array alternate key conflicts', () => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(aliasesAsKeyOptions, initThings);
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
    });

    describe('addRange method', (): void => {
        const goodInit: FakeProps[] = [
            { name: 'Fourth Place', alternateName: 'Top', aliases: ['Salmon', 'Moose'], city: 'Anchorage', state: 'Alaska', isSpecial: false, externalId: 'whatever' },
            { name: 'Fifth Place', alternateName: 'Center', city: 'St Louis', state: 'Missouri', isSpecial: false, externalId: 'whatever' },
            { name: 'Sixth Place', alternateName: 'Bottom', aliases: ['Disneyworld'], city: 'Orlando', state: 'Florida', isSpecial: false },
        ];
        it('should add all elements of a range if there are no conflicts', (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
            dir.addRange(goodInit.map((i) => new FakeKeyedThing(i)));
            expect(dir.size).toBe(init.length + goodInit.length);
            [init, goodInit].forEach((group): void => {
                forEachAlternateKey(group, dir.alternateKeys, (key: keyof FakeKeys|null, value: string, elem: FakeKeyedThing): void => {
                    if (key === null) {
                        expect(dir.get(value)).toMatchObject(elem);
                    }
                    else {
                        expect(dir.getByField(key, value)).toMatchObject(elem);
                    }
                });
            });
        });

        function checkKeyCorrectness(dir: Directory<FakeKeyedThing, FakeProps, FakeKeys>, present: FakeProps[], missing: FakeProps[]): void {
            expect(dir.size).toBe(present.length);
            forEachAlternateKey(present, dir.alternateKeys, (key: keyof FakeKeys|null, value: string, elem: FakeKeyedThing): void => {
                if (key === null) {
                    expect(dir.get(value)).toMatchObject(elem);
                }
                else {
                    expect(dir.getByField(key, value)).toMatchObject(elem);
                }
            });

            forEachAlternateKey(missing, dir.alternateKeys, (key: keyof FakeKeys|null, value: string, elem: FakeKeyedThing): void => {
                if (key === null) {
                    expect(dir.get(value)).not.toBe(elem);
                }
                else {
                    expect(dir.getByField(key, value)).not.toBe(elem);
                }
            });
        }

        function checkSearchCorrectness(
            dir: Directory<FakeKeyedThing, FakeProps, FakeKeys>,
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
                    found = found || (result.item.primaryKey === Names.normalizeString(elem.name));
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
                const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/^duplicate entries/i);
            });

            it('should not add any elements by name or any alternate key', (): void => {
                const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/^duplicate entries/i);

                checkKeyCorrectness(dir, init, badInit);
            });

            it('should not add any elements to the search index', (): void => {
                const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/^duplicate entries/i);

                checkSearchCorrectness(dir, alternateKeyOptions.textSearchKeys, init, badInit);
            });

            it('should throw if any value of an array alternate key conflicts', () => {
                const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(aliasesAsKeyOptions, initThings);
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
                checkSearchCorrectness(dir, alternateKeyOptions.textSearchKeys, init, conflictingInit);
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
                const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);
            });

            it('should not add any elements by name or any alternate key', (): void => {
                const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);

                checkKeyCorrectness(dir, init, badInit);
            });

            it('should not add any elements to the search index', (): void => {
                const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);

                checkSearchCorrectness(dir, alternateKeyOptions.textSearchKeys, init, badInit);
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
                const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);
            });

            it('should not add any elements by name or any alternate key', (): void => {
                const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);

                checkKeyCorrectness(dir, init, badInit);
            });

            it('should not add any elements to the search index', (): void => {
                const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
                expect((): void => {
                    dir.addRange(badInit.map((i) => new FakeKeyedThing(i)));
                }).toThrowError(/range.*duplicate/i);

                checkSearchCorrectness(dir, alternateKeyOptions.textSearchKeys, init, badInit);
            });
        });
    });

    describe('keys property', (): void => {
        it('should include all of the keys', (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
            const keys = dir.keys;

            expect(keys.length).toBe(init.length);
            keys.forEach((k): void => {
                let found = false;
                init.forEach((i): void => {
                    found = found || (Names.normalizeString(i.name) === k);
                });
                expect(found).toBe(true);
            });

            init.forEach((i): void => {
                expect(keys).toContain(Names.normalizeString(i.name));
            });
        });
    });

    describe('alternate keys', () => {
        const altKeysDir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
        const noAltKeysDir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(noAlternateKeyOptions, initThings);

        describe('isAlternateKey method', () => {
            it('should return true for a valid alternate key', () => {
                for (const altKey of alternateKeyOptions.alternateKeys) {
                    expect(altKeysDir.isAlternateKey(altKey)).toBe(true);
                }
            });

            it('should return false for a invalid alternate key', () => {
                for (const altKey of alternateKeyOptions.alternateKeys) {
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
                expect(altKeysDir.alternateKeys).toEqual(alternateKeyOptions.alternateKeys);
            });

            it('should return an empty array if there are no alternate keys', () => {
                expect(noAltKeysDir.alternateKeys).toEqual([]);
            });
        });
    });

    describe('forEach method', (): void => {
        it('should enumerate all of the items', (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
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
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
            const kt = dir.get(init[0].name);
            expect(dir.getKeys(kt)).toEqual(kt.keys);
        });

        it('should return undefined for an element not in the directory', (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
            const elem = new FakeKeyedThing({ name: 'Fourth Place', alternateName: init[0].alternateName, city: 'Bangor', state: 'Maine' });
            expect(dir.getKeys(elem)).toBeUndefined();
        });

        it('should throw if the directory contains a different object with the same name', (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
            const elem = new FakeKeyedThing(init[0]);
            expect((): void => {
                dir.getKeys(elem);
            }).toThrowError(/does not match/i);
        });
    });

    describe('get method', (): void => {
        it('should get an item by name', (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(noAlternateKeyOptions, initThings);
            init.forEach((i): void => {
                const kt = dir.get(i.name);
                expect(kt.primaryKey).toBe(Names.normalizeString(i.name));
                expect(kt).toMatchObject(i);
            });
        });
    });

    describe('getByField method', (): void => {
        it('should get an item by the value of a specified field', (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, initThings);
            init.forEach((i): void => {
                if (i.alternateName) {
                    const kt = dir.getByField('alternateName', i.alternateName);
                    expect(kt.keys.alternateName).toBe(Names.normalizeString(i.alternateName));
                }
            });
        });

        it('should throw if the specified field is not an alternate key', (): void => {
            const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(noAlternateKeyOptions, initThings);
            expect((): void => {
                dir.getByField('alternateName', init[0].alternateName);
            }).toThrowError(/not an alternate key/i);
        });
    });

    describe('getByAnyFieldExact methad', (): void => {
        const ktInit = [
            ...init,
            { name: 'Second and a half Place', alternateName: 'Second Place', city: 'Denver', state: 'Colorado', isSpecial: true, externalId: 'MileHigh' },
        ];
        const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(alternateKeyOptions, ktInit.map((i) => new FakeKeyedThing(i)));

        it('should get all items matching the normalized value of the primary key or any alternate key', () => {
            const things = dir.getByAnyFieldExact('Second Place');
            expect(things.length).toBe(2);
        });

        it('should return an empty array if nothing matches', () => {
            const things = dir.getByAnyFieldExact('Toronto');
            expect(things.length).toBe(0);
        });
    });

    describe('lookup method', (): void => {
        const dir = new Directory<FakeKeyedThing, FakeProps, FakeKeys>(noAlternateKeyOptions, initThings);
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

        it('should return undefined when nothing matches', (): void => {
            expect(dir.lookup('xyzzy')).toBeUndefined();
        });
    });
});
