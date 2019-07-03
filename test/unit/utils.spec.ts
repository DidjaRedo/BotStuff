"use strict";

import { Utils } from "../../src/utils";

describe("Utils static class", (): void => {
    describe("select iterable converter", (): void => {
        it("should convert all elements in an array", (): void => {
            const source = ["1", "2", "3"];
            const result = Utils.select(source, (source: string): number => {
                return Number(source);
            });
            expect(result).toEqual([1, 2, 3]);
        });

        it("should omit elements that convert to undefined", (): void => {
            const source = ["1", "2", "boo", "3"];
            const result = Utils.select(source, (source: string): number|undefined => {
                return (source === "boo") ? undefined : Number(source);
            });
            expect(result).toEqual([1, 2, 3]);
        });

        it("should return an empty array for an undefined parametr", (): void => {
            expect(Utils.select<string, string>(undefined, (s: string): string => s)).toEqual([]);
        });
    });

    describe("Utils toArray static method", (): void => {
        it("should convert an iterable to an array", (): void => {
            expect(Utils.toArray("blargle")).toEqual(["b", "l", "a", "r", "g", "l", "e"]);
        });
    });
});
