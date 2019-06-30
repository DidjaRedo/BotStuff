"use strict";

import { Names } from "../../src/names";

describe("Names static class", (): void => {
    describe("normalize static method", (): void => {
        it("should normalize a string", (): void => {
            expect(Names.normalize("Some String")).toBe("somestring");
        });

        it("should throw for an empty string", (): void => {
            expect((): string|string[] => Names.normalize("   ")).toThrowError("Cannot normalize an empty string.");
        });

        /*
        it("should throw for anything but string or array", (): void => {
            [
                {}, true, 11, undefined, null, (): boolean => true,
            ].forEach((badParam): void => {
                expect(() => NormalizedMap.normalize(badParam)).toThrowError(/cannot normalize an input of type/i);
            });
        });
        */

        it("should normalize all strings in an array", (): void => {
            expect(Names.normalize(["BLAH", "Some name with spaces and punctuation!", "this-is-a-test"])).toEqual([
                "blah", "somenamewithspacesandpunctuation", "thisisatest",
            ]);
        });

        it("should throw if any strings are empty", (): void => {
            expect((): string|string[] => Names.normalize(["BLAH", "    "])).toThrowError("Cannot normalize an empty string.");
        });
    });
});
