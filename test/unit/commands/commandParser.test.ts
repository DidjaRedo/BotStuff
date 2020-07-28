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
import { CommandParser, ParserBuilder } from '../../../src/commands/commandParser';

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
        test('constructs from an object', () => {
            expect(() => new ParserBuilder(fields)).not.toThrow();
        });
    });

    describe('build', () => {
        const builder = new ParserBuilder(fields);

        test('builds a parser from an array of strings or a string', () => {
            [
                ['!place', '{{words}}', '@', '{{moreWords}}'],
                '!place {{words}} @ {{moreWords}}',
            ].forEach((command) => {
                expect(builder.build(command)).toSucceedAndSatisfy((p: CommandParser<typeof fields>) => {
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

        test('makes optional fields conditional', () => {
            expect(builder.build('!beast {{tier?}} {{words}}')).toSucceedAndSatisfy((p: CommandParser<typeof fields>) => {
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

        test('reports an error if a commond references an unknown field', () => {
            expect(builder.build('!command {{oops}}')).toFailWith(/unrecognized property/i);
        });

        test('reports an error if a command is has too many capture groups', () => {
            expect(builder.build('!command {{broken}}')).toSucceedAndSatisfy((p: CommandParser<typeof fields>) => {
                expect(p.parse('!command test')).toFailWith(/mismatched capture count/i);
            });
        });
    });
});
