"use strict";

import { RegExpBuilder } from "../../src/regExpBuilder";

describe("RegExpBuilder static class", (): void => {
    const fields = [
        { name: "[tier]", value: "(?:(?:L|T|l|t)?(\\d+))", optional: true },
        { name: "[word]", value: "/\\w+/" },
        { name: "[words]", value: "(\\w+(?:\\s|\\w|`|'|-|\\.)*)" },
        { name: "[time]", value: "(?:\\d?\\d):?(?:\\d\\d)\\s*(?:a|A|am|AM|p|P|pm|PM)?)", optional: false },
        { name: "[timer]", value: "(\\d?\\d)" },
    ];

    describe("constructor", (): void => {
        it("should construct from an array of fragments", (): void => {
            const rb = new RegExpBuilder(fields);
            expect(rb).toBeDefined();
        });

        it("should throw for an empty array", (): void => {
            expect((): RegExpBuilder => new RegExpBuilder([])).toThrowError(/at least.*fragment/i);
        });
    });

    describe("buildString method", (): void => {
        const rb: RegExpBuilder = new RegExpBuilder(fields);

        it("should build a RegExp string from an array of strings", (): void => {
            const result: string = rb.buildString(["!place", "[words]", "@", "[words]"]);
            expect(result).toBe("^\\s*!place\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s+@\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s*$");
        });

        it("should build a RegExp string from a string containing fields and literals", (): void => {
            const result: string = rb.buildString("!place [words] @ [words]");
            expect(result).toBe("^\\s*!place\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s+@\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s*$");
        });

        it("should make optional fields conditional", (): void => {
            const result: string = rb.buildString("!beast [tier] [words]");
            expect(result).toBe("^\\s*!beast\\s+(?:(?:(?:(?:L|T|l|t)?(\\d+)))\\s+)?(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s*$");
        });
    });

    describe("build method", (): void => {
        const rb: RegExpBuilder = new RegExpBuilder(fields);
        it("should build a RegExp from an array of strings", (): void => {
            const result: RegExp = rb.build(["!place", "[words]", "@", "[words]"]);
            expect(result instanceof RegExp).toBe(true);
            expect(result.toString()).toBe("/^\\s*!place\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s+@\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s*$/");
        });

        it("should build a RegExp from a string containing fields an literals", (): void => {
            const result: RegExp = rb.build("!beast [tier] [words]");
            expect(result instanceof RegExp).toBe(true);
            expect(result.toString()).toBe("/^\\s*!beast\\s+(?:(?:(?:(?:L|T|l|t)?(\\d+)))\\s+)?(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s*$/");
        });

        it("should build a RegExp that has the expected matching behavior", (): void => {
            interface RegExpBuilderTestCase {
                input: string;
                isMatch: boolean;
                matches?: (string|undefined)[];
            };
            interface RegExpBuilderTest {
                source: string[]|string;
                cases: RegExpBuilderTestCase[];
            };
            [
                {
                    source: "!place [words] @ [words]",
                    cases: [
                        { input: "!place hunting fox @ redmond", isMatch: true, matches: ["hunting fox", "redmond"] },
                    ],
                },
                {
                    source: ["!beast", "[tier]", "[words]"],
                    cases: [
                        { input: "!beast T5 horned serpent", isMatch: true, matches: ["5", "horned serpent"] },
                        { input: "!beast ron weasley", isMatch: true, matches: [undefined, "ron weasley"] },
                    ],
                },
            ].forEach((test: RegExpBuilderTest): void => {
                const regex: RegExp = rb.build(test.source);
                test.cases.forEach((testCase: RegExpBuilderTestCase): void => {
                    const result = regex.exec(testCase.input);
                    testCase.matches.forEach((match: string, index: number): void => {
                        expect(result[index + 1]).toBe(match);
                    });
                });
            });
        });
    });
});
