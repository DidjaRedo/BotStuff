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
import { CommandParser, ParserBuilder, RegExpBuilder } from '../../../src/commands/regExpBuilder';

describe('ParserBuilder class', () => {
    const fields = {
        tier: { value: '(?:(?:L|T|l|t)?(\\d+))', hasEmbeddedCapture: true },
        word: { value: '/\\w+/' },
        words: { value: "\\w+(?:\\s|\\w|\\d|`|'|-|\\.)*" },
        moreWords: { value: "\\w+(?:\\s|\\w|\\d|`|'|-|\\.)*" },
        time: { value: '(?:\\d?\\d):?(?:\\d\\d)\\s*(?:a|A|am|AM|p|P|pm|PM)?)', optional: false },
        timer: { value: '\\d?\\d' },
        broken: { value: '(\\w)(\\w)(\\w)(\\w)' },
    };

    describe('constructor', () => {
        it('should construct from an object of parsers', () => {
            expect(() => new ParserBuilder(fields)).not.toThrow();
        });
    });

    describe('build', () => {
        const builder = new ParserBuilder(fields);

        it('should build a parser from an array of strings or a string', () => {
            [
                ['!place', '{{words}}', '@', '{{moreWords}}'],
                '!place {{words}} @ {{moreWords}}',
            ].forEach((command) => {
                expect(builder.build(command)).toSucceedWithCallback((p: CommandParser<typeof fields>) => {
                    expect(p.regexp.toString()).toEqual('/^\\s*!place\\s+(\\w+(?:\\s|\\w|\\d|`|\'|-|\\.)*)\\s+@\\s+(\\w+(?:\\s|\\w|\\d|`|\'|-|\\.)*)\\s*$/');
                    expect(p.captures).toEqual(['words', 'moreWords']);
                    [
                        ['these are some words', 'some more words'],
                    ].forEach((t) => {
                        expect(p.parse(`!place ${t[0]} @ ${t[1]}`)).toSucceedWith(
                            expect.objectContaining({
                                words: t[0],
                                moreWords: t[1],
                            }),
                        );
                    });
                });
            });
        });

        it('should make optional fields conditional', () => {
            expect(builder.build('!beast {{tier?}} {{words}}')).toSucceedWithCallback((p: CommandParser<typeof fields>) => {
                expect(p.regexp.toString()).toEqual('/^\\s*!beast(?:\\s+(?:(?:L|T|l|t)?(\\d+)))?\\s+(\\w+(?:\\s|\\w|\\d|`|\'|-|\\.)*)\\s*$/');
                expect(p.captures).toEqual(['tier', 'words']);
                [
                    {
                        src: '!beast T5 some beast',
                        expected: {
                            tier: '5',
                            words: 'some beast',
                        },
                    },
                    {
                        src: '!beast some beast',
                        success: true,
                        expected: {
                            tier: undefined,
                            words: 'some beast',
                        },
                    },
                    {
                        src: '!beat some beast',
                        expected: undefined,
                    },
                ].forEach((t) => {
                    expect(p.parse(t.src)).toSucceedWith(t.expected);
                });
            });
        });

        it('should report an error if a commond references an unknown field', () => {
            expect(builder.build('!command {{oops}}')).toFailWith(/unrecognized property/i);
        });

        it('should report an error if a command is has too many capture groups', () => {
            expect(builder.build('!command {{broken}}')).toSucceedWithCallback((p: CommandParser<typeof fields>) => {
                expect(p.parse('!command test')).toFailWith(/mismatched capture count/i);
            });
        });
    });
});

describe('RegExpBuilder static class', (): void => {
    const fields = [
        { name: '[tier]', value: '(?:(?:L|T|l|t)?(\\d+))', optional: true },
        { name: '[word]', value: '/\\w+/' },
        { name: '[words]', value: "(\\w+(?:\\s|\\w|`|'|-|\\.)*)" },
        { name: '[time]', value: '(?:\\d?\\d):?(?:\\d\\d)\\s*(?:a|A|am|AM|p|P|pm|PM)?)', optional: false },
        { name: '[timer]', value: '(\\d?\\d)' },
    ];

    describe('constructor', (): void => {
        it('should construct from an array of fragments', (): void => {
            const rb = new RegExpBuilder(fields);
            expect(rb).toBeDefined();
        });

        it('should throw for an empty array', (): void => {
            expect((): RegExpBuilder => new RegExpBuilder([])).toThrowError(/at least.*fragment/i);
        });
    });

    describe('buildString method', (): void => {
        const rb: RegExpBuilder = new RegExpBuilder(fields);

        it('should build a RegExp string from an array of strings', (): void => {
            const result: string = rb.buildString(['!place', '[words]', '@', '[words]']);
            expect(result).toBe("^\\s*!place\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s+@\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s*$");
        });

        it('should build a RegExp string from a string containing fields and literals', (): void => {
            const result: string = rb.buildString('!place [words] @ [words]');
            expect(result).toBe("^\\s*!place\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s+@\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s*$");
        });

        it('should make optional fields conditional', (): void => {
            const result: string = rb.buildString('!beast [tier] [words]');
            expect(result).toBe("^\\s*!beast\\s+(?:(?:(?:(?:L|T|l|t)?(\\d+)))\\s+)?(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s*$");
        });
    });

    describe('build method', (): void => {
        const rb: RegExpBuilder = new RegExpBuilder(fields);
        it('should build a RegExp from an array of strings', (): void => {
            const result: RegExp = rb.build(['!place', '[words]', '@', '[words]']);
            expect(result instanceof RegExp).toBe(true);
            expect(result.toString()).toBe("/^\\s*!place\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s+@\\s+(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s*$/");
        });

        it('should build a RegExp from a string containing fields an literals', (): void => {
            const result: RegExp = rb.build('!beast [tier] [words]');
            expect(result instanceof RegExp).toBe(true);
            expect(result.toString()).toBe("/^\\s*!beast\\s+(?:(?:(?:(?:L|T|l|t)?(\\d+)))\\s+)?(\\w+(?:\\s|\\w|`|'|-|\\.)*)\\s*$/");
        });

        it('should build a RegExp that has the expected matching behavior', (): void => {
            interface RegExpBuilderTestCase {
                input: string;
                isMatch: boolean;
                matches?: (string|undefined)[];
            }
            interface RegExpBuilderTest {
                source: string[]|string;
                cases: RegExpBuilderTestCase[];
            }
            [
                {
                    source: '!place [words] @ [words]',
                    cases: [
                        { input: '!place hunting fox @ redmond', isMatch: true, matches: ['hunting fox', 'redmond'] },
                    ],
                },
                {
                    source: ['!beast', '[tier]', '[words]'],
                    cases: [
                        { input: '!beast T5 horned serpent', isMatch: true, matches: ['5', 'horned serpent'] },
                        { input: '!beast ron weasley', isMatch: true, matches: [undefined, 'ron weasley'] },
                    ],
                },
            ].forEach((test: RegExpBuilderTest): void => {
                const regex: RegExp = rb.build(test.source);
                test.cases.forEach((testCase: RegExpBuilderTestCase): void => {
                    const result = regex.exec(testCase.input);
                    expect(result).not.toBe(null);
                    if (result !== null) {
                        // eslint-disable-next-line no-unused-expressions
                        testCase.matches?.forEach((match: string, index: number): void => {
                            expect(result[index + 1]).toBe(match);
                        });
                    }
                });
            });
        });
    });
});
