"use strict";

import { Names } from "../../src/names";
import { KeyedThing } from "../../src/keyedThing";
import { Directory, DirectoryLookupOptions } from "../../src/directory";
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

    describe("forEachKeyedThing method", (): void => {

    });

    describe("forEach method", (): void => {

    });

    describe("getKeys method", (): void => {

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

    });

    describe("getByField method", (): void => {

    });

    describe("lookup method", (): void => {

    });
});
