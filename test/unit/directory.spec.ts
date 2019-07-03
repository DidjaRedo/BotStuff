"use strict";

import { Names } from "../../src/names";
import { KeyedThing } from "../../src/keyedThing";
import { Directory, DirectoryLookupOptions, FieldSearchWeight } from "../../src/directory";
import { FakeInit, FakeProps, FakeNormalizedProps } from "./fakeKeyedThing";

describe("Directory class", (): void => {
    const noAlternateKeyOptions: DirectoryLookupOptions<FakeProps, FakeNormalizedProps> = {
        threshold: 0.2,
        keys: [
            { name: "name", weight: 0.9 },
            { name: "alternateName", weight: 0.8 },
            { name: "aliases", weight: 0.7 },
        ],
    };
    const alternateKeyOptions: DirectoryLookupOptions<FakeProps, FakeNormalizedProps> = {
        threshold: 0.2,
        keys: [
            { name: "name", weight: 0.9 },
            { name: "alternateName", weight: 0.8 },
            { name: "aliases", weight: 0.7 },
        ],
        alternateKeys: ["alternateName"],
    };

    const init: FakeProps[] = [
        { name: "First Place", alternateName: "Start", aliases: ["Hipsters", "Coffee"], city: "Seattle", state: "Washington", isSpecial: true, externalId: "Origin" },
        { name: "Second Place", alternateName: "Middle", city: "Denver", state: "Colorado", isSpecial: true, externalId: "MileHigh" },
        { name: "Third Place", alternateName: "End", aliases: ["Big Apple"], city: "New York", state: "New York", isSpecial: false },
    ];

    type PropIndexer = (field: keyof FakeNormalizedProps|null, value: string, elem: FakeProps) => void;
    function forEachAlternateKey(props: Iterable<FakeProps>, alternateKeys: (keyof FakeNormalizedProps)[], cb: PropIndexer): void {
        for (const elem of props) {
            cb(null, elem.name, elem);
            if (alternateKeys) {
                alternateKeys.forEach((ak): void => {
                    let values = elem[ak];
                    values = (Array.isArray(values) ? values : [values]);
                    values.forEach((v): void => {
                        cb(ak, v, elem);
                    });
                });
            }
        };
    }

    type PropSearcher = (field: keyof FakeProps, value: string, weight: number, elem: FakeProps) => void;
    function forEachSearchableString(props: Iterable<FakeProps>, keys: FieldSearchWeight<FakeProps>[], cb: PropSearcher) {
        for (const elem of props) {
            for (const key of keys) {
                let v = elem[key.name];
                if (typeof v === "string") {
                    v = [v];
                }
                else if (!Array.isArray(v)) {
                    continue;
                }

                v.forEach((s): void => {
                    cb(key.name, s, key.weight, elem);
                });
            }
        }
    }

    describe("constructor", (): void => {
        it("should construct with initializers", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(noAlternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            expect(dir).toBeDefined();
            expect(dir.size).toBe(init.length);
        });

        it("should construct without initializers", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(noAlternateKeyOptions);
            expect(dir).toBeDefined();
            expect(dir.size).toBe(0);
        });
    });

    describe("add method", (): void => {
        it("should add a new element that doesn't conflict", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            const elem = { name: "Fourth Place", alternateName: "Past the End", city: "Bangor", state: "Maine" };
            dir.add(FakeInit.toInit(elem));
            expect(dir.size).toBe(init.length + 1);
            expect(dir.get(elem.name)).toBe(elem);
        });

        it("should add elements to the search index", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            const elem = { name: "Fourth Place", alternateName: "Past the End", city: "Bangor", state: "Maine" };

            dir.add(FakeInit.toInit(elem));

            [elem.name, elem.alternateName].forEach((name): void => {
                const part = name.split(" ")[0].toLowerCase();
                const matches = dir.lookup(part);
                expect(matches.length).toBeGreaterThan(0);
                expect(matches[0].item).toBe(elem);
            });
        });

        it("should throw if an element name conflicts", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            const elem = { name: init[0].name, alternateName: "Past the End", city: "Bangor", state: "Maine" };
            expect((): void => {
                dir.add(FakeInit.toInit(elem));
            }).toThrowError(/duplicate/i);
        });

        it("should throw if another indexed property conflicts", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            const elem = { name: "Fourth Place", alternateName: init[0].alternateName, city: "Bangor", state: "Maine" };
            expect((): void => {
                dir.add(FakeInit.toInit(elem));
            }).toThrowError(/duplicate/i);
        });
    });

    describe("addRange method", (): void => {
        const goodInit: FakeProps[] = [
            { name: "Fourth Place", alternateName: "Top", aliases: ["Salmon", "Moose"], city: "Anchorage", state: "Alaska", isSpecial: false, externalId: "whatever" },
            { name: "Fifth Place", alternateName: "Center", city: "St Louis", state: "Missouri", isSpecial: false, externalId: "whatever" },
            { name: "Sixth Place", alternateName: "Bottom", aliases: ["Disneyworld"], city: "Orlando", state: "Florida", isSpecial: false },
        ];
        it("should add all elements of a range if there are no conflicts", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            dir.addRange(KeyedThing.init(goodInit, FakeInit.toInit));
            expect(dir.size).toBe(init.length + goodInit.length);
            [init, goodInit].forEach((group): void => {
                forEachAlternateKey(group, dir.alternateKeys, (key: keyof FakeNormalizedProps|null, value: string, elem: FakeProps): void => {
                    if (key === null) {
                        expect(dir.get(value)).toBe(elem);
                    }
                    else {
                        expect(dir.getByField(key, value)).toBe(elem);
                    }
                });
            });
        });

        function checkKeyCorrectness(dir: Directory<FakeProps, FakeNormalizedProps>, present: FakeProps[], missing: FakeProps[]): void {
            expect(dir.size).toBe(present.length);
            forEachAlternateKey(present, dir.alternateKeys, (key: keyof FakeNormalizedProps|null, value: string, elem: FakeProps): void => {
                if (key === null) {
                    expect(dir.get(value)).toBe(elem);
                }
                else {
                    expect(dir.getByField(key, value)).toBe(elem);
                }
            });

            forEachAlternateKey(missing, dir.alternateKeys, (key: keyof FakeNormalizedProps|null, value: string, elem: FakeProps): void => {
                if (key === null) {
                    expect(dir.get(value)).not.toBe(elem);
                }
                else {
                    expect(dir.getByField(key, value)).not.toBe(elem);
                }
            });
        }

        function checkSearchCorrectness(dir: Directory<FakeProps, FakeNormalizedProps>, keys: FieldSearchWeight<FakeProps>[], present: FakeProps[], missing: FakeProps[]): void {
            expect(dir.size).toBe(present.length);

            forEachSearchableString(present, keys, (__: keyof FakeProps, value: string, ___: number, elem: FakeProps): void => {
                const results = dir.lookup(value);
                expect(results.length).toBeGreaterThan(0);
                let found = false;
                for (const result of results) {
                    found = found || (result.item === elem);
                }
                expect(found).toBe(true);
            });

            forEachSearchableString(missing, keys, (__: keyof FakeProps, value: string, ___: number, elem: FakeProps): void => {
                const results = dir.lookup(value);
                // no results is a pass
                if (results && (results.length > 0)) {
                    for (const result of results) {
                        expect(result.item).not.toBe(elem);
                    }
                }
            });
        }

        describe("if a name conflicts with existing values", (): void => {
            const badInit: FakeProps[] = [
                { name: "Fourth Place", alternateName: "Top", aliases: ["Salmon", "Moose"], city: "Anchorage", state: "Alaska", isSpecial: false, externalId: "whatever" },
                { name: "Fifth Place", alternateName: "Center", city: "St Louis", state: "Missouri", isSpecial: false, externalId: "whatever" },
                { name: "First Place", alternateName: "Bottom", aliases: ["Disneyworld"], city: "Orlando", state: "Florida", isSpecial: false },
            ];
            it("should throw on add", (): void => {
                const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
                expect((): void => {
                    dir.addRange(KeyedThing.init(badInit, FakeInit.toInit));
                }).toThrowError(/^duplicate entries/i);
            });

            it("should not add any elements by name or any alternate key", (): void => {
                const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
                expect((): void => {
                    dir.addRange(KeyedThing.init(badInit, FakeInit.toInit));
                }).toThrowError(/^duplicate entries/i);

                checkKeyCorrectness(dir, init, badInit);
            });

            it("should not add any elements to the search index", (): void => {
                const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
                expect((): void => {
                    dir.addRange(KeyedThing.init(badInit, FakeInit.toInit));
                }).toThrowError(/^duplicate entries/i);

                checkSearchCorrectness(dir, alternateKeyOptions.keys, init, badInit);
            });
        });

        describe("if a name conflicts with other values to be added", (): void => {
            const badInit: FakeProps[] = [
                { name: "Fourth Place", alternateName: "Top", aliases: ["Salmon", "Moose"], city: "Anchorage", state: "Alaska", isSpecial: false, externalId: "whatever" },
                { name: "Fifth Place", alternateName: "Center", city: "St Louis", state: "Missouri", isSpecial: false, externalId: "whatever" },
                { name: "Sixth Place", alternateName: "Bottom", aliases: ["Disneyworld"], city: "Orlando", state: "Florida", isSpecial: false },
                { name: "Fourth Place", alternateName: "Way Below", aliases: ["Barbecue"], city: "Austin", state: "Texas", isSpecial: false, externalId: "whatever" },
            ];

            it("should throw on add", (): void => {
                const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
                expect((): void => {
                    dir.addRange(KeyedThing.init(badInit, FakeInit.toInit));
                }).toThrowError(/range.*duplicate/i);
            });

            it("should not add any elements by name or any alternate key", (): void => {
                const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
                expect((): void => {
                    dir.addRange(KeyedThing.init(badInit, FakeInit.toInit));
                }).toThrowError(/range.*duplicate/i);

                checkKeyCorrectness(dir, init, badInit);
            });

            it("should not add any elements to the search index", (): void => {
                const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
                expect((): void => {
                    dir.addRange(KeyedThing.init(badInit, FakeInit.toInit));
                }).toThrowError(/range.*duplicate/i);

                checkSearchCorrectness(dir, alternateKeyOptions.keys, init, badInit);
            });
        });
    });

    describe("forEachKeyedThing method", (): void => {

    });

    describe("forEach method", (): void => {

    });

    describe("getNormalizedValues method", (): void => {
        it("should return the normalized values for an element in the directory", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            const kt = dir.getKeyedThing(init[0].name);
            expect(dir.getNormalizedValues(kt.properties)).toEqual(kt.normalized);
        });

        it("should return undefined for an element not in the directory", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            const elem = { name: "Fourth Place", alternateName: init[0].alternateName, city: "Bangor", state: "Maine" };
            expect(dir.getNormalizedValues(elem)).toBe(undefined);
        });

        it("should throw if the directory contains a different object with the same name", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            const elem = Object.assign({}, init[0]);
            expect((): void => {
                dir.getNormalizedValues(elem);
            }).toThrowError(/does not match/i);
        });
    });

    describe("getKeyedThing method", (): void => {
        it("should get a keyed thing by name", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(noAlternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            init.forEach((i): void => {
                const kt = dir.getKeyedThing(i.name);
                expect(kt.key).toBe(Names.normalizeString(i.name));
                expect(kt.properties).toBe(i);
            });
        });
    });

    describe("getKeyedThingByField method", (): void => {
        it("should get a keyed thing by the normalized value of a specified field", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(alternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            init.forEach((i): void => {
                if (i.alternateName) {
                    const kt = dir.getKeyedThingByField("alternateName", i.alternateName);
                    expect(kt.normalized.alternateName).toBe(Names.normalizeString(i.alternateName));
                }
            });
        });

        it("should throw if the specified field is not an alternate key", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(noAlternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            expect((): void => {
                dir.getKeyedThingByField("alternateName", init[0].alternateName);
            }).toThrowError(/not an alternate key/i);
        });
    });

    describe("get method", (): void => {
        it("should get the stored object by normalized name", (): void => {
            const dir = new Directory<FakeProps, FakeNormalizedProps>(noAlternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
            init.forEach((i): void => {
                const thing = dir.get(i.name);
                expect(thing).toBe(i);
            });
        });
    });

    describe("getByField method", (): void => {

    });

    describe("lookup method", (): void => {
        const dir = new Directory<FakeProps, FakeNormalizedProps>(noAlternateKeyOptions, KeyedThing.init(init, FakeInit.toInit));
        it("should get a scored list of possible matches based on name", (): void => {

            init.forEach((i): void => {
                const partialName = i.name.split(" ");
                const result = dir.lookup(partialName[0]);
                expect(result.length).toBeGreaterThan(0);
                expect(result[0].item).toBe(i);
            });
        });

        it("should get a scored list of possible matches based other indexed properties", (): void => {
            init.forEach((i): void => {
                if (i.alternateName) {
                    const partialName = i.alternateName.split(" ");
                    let result = dir.lookup(partialName[0]);
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].item).toBe(i);
                }

                if (i.aliases) {
                    i.aliases.forEach((a): void => {
                        const partialName = a.split(" ");
                        let result = dir.lookup(partialName[0]);
                        expect(result.length).toBeGreaterThan(0);
                        expect(result[0].item).toBe(i);
                    });
                }
            });
        });

        it("should return undefined when nothing matches", (): void => {
            expect(dir.lookup("xyzzy")).toBeUndefined();
        });
    });
});
