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
import { Names } from '../../../src/names/names';

describe('Names static class', (): void => {
    describe('isValidName static menthod', (): void => {
        it('should return true for non-empty, non-whitespace strings', (): void => {
            ['s', '_', '1'].forEach((str: string): void => {
                expect(Names.isValidName(str)).toBe(true);
            });
        });

        it('should return false for empty strings or whitespace strings', (): void => {
            ['', undefined, '   '].forEach((str: string): void => {
                expect(Names.isValidName(str)).toBe(false);
            });
        });
    });

    describe('throwOnInvalidName static method', (): void => {
        describe('with a single string', () => {
            it('should return for non-empty, non-whitespace strings', (): void => {
                ['s', '_', '1'].forEach((str: string): void => {
                    expect((): void => Names.throwOnInvalidName(str, 'some field')).not.toThrow();
                });
            });

            it('should throw for empty strings or whitespace strings', (): void => {
                ['', undefined, '   '].forEach((str: string): void => {
                    expect((): void => Names.throwOnInvalidName(str, 'some field')).toThrowError(/non-empty/i);
                });
            });

            it('should include the field name in the error description', (): void => {
                ['some field', 'name', 'location'].forEach((desc: string): void => {
                    expect((): void => Names.throwOnInvalidName('  ', desc)).toThrowError(new RegExp(`^.*${desc}.*$`));
                });
            });

            it('should throw for anything but string or Iterable<string>', (): void => {
                [
                    {}, true, 11, undefined, null, (): boolean => true,
                ].forEach((badParam): void => {
                    expect(() => Names.throwOnInvalidName(badParam as string, 'bogus')).toThrowError();
                });
            });
        });

        describe('with Iterable<string>', () => {
            it('should return for any iterable containing non-empty, non-whitespace strings', (): void => {
                const good = ['s', '_', '1'];
                expect((): void => Names.throwOnInvalidName(good, 'some field')).not.toThrow();
                expect((): void => Names.throwOnInvalidName(new Set(good), 'some field')).not.toThrow();
            });

            it('should throw for any iterable containin empty strings or whitespace strings', (): void => {
                const bad = ['', undefined, '   '];
                expect((): void => Names.throwOnInvalidName(bad, 'some field')).toThrow(/must be non-empty/i);
                expect((): void => Names.throwOnInvalidName(new Set(bad), 'some field')).toThrow(/must be non-empty/i);
            });

            it('should include the field name in the error description', (): void => {
                const bad = ['', undefined, '   '];
                ['some field', 'name', 'location'].forEach((desc: string): void => {
                    expect((): void => Names.throwOnInvalidName(bad, desc)).toThrowError(new RegExp(`.*${desc}.*`));
                });
            });

            it('should enforce mininmum length constraint, if present', (): void => {
                const good = ['s', '_', '1'];
                for (let i = 0; i <= good.length; i++) {
                    expect((): void => Names.throwOnInvalidName(good, 'some field', i)).not.toThrowError();
                }

                expect((): void => Names.throwOnInvalidName(good, 'some field', good.length + 1)).toThrowError(/at least/i);
            });
        });
    });


    describe('validate static method', () => {
        it('should validate a valid single string', () => {
            expect.assertions(1);
            const result = Names.validate('is good', 'test string');
            expect(result.isSuccess()).toBe(true);
        });

        it('should validate an array of strings', () => {
            expect.assertions(1);
            const result = Names.validate(['is good', 'is also good'], 'test string');
            expect(result.isSuccess()).toBe(true);
        });
    });

    describe('normalizeOrThrow static method', () => {
        it('should normalize a string', (): void => {
            expect(Names.normalizeOrThrow('Some String')).toBe('somestring');
        });

        it('should throw for an empty string', (): void => {
            expect((): string|string[] => Names.normalizeOrThrow('   ')).toThrowError('Cannot normalize an empty string.');
        });

        it('should throw for anything but string or array', (): void => {
            [
                {}, true, 11, undefined, null, (): boolean => true,
            ].forEach((badParam): void => {
                expect(() => Names.normalizeOrThrow(badParam as string)).toThrowError(/cannot normalize/i);
            });
        });

        it('should normalize all strings in an array', (): void => {
            expect(Names.normalizeOrThrow(['BLAH', 'Some name with spaces and punctuation!', 'this-is-a-test'])).toEqual([
                'blah', 'somenamewithspacesandpunctuation', 'thisisatest',
            ]);
        });

        it('should throw if any strings are empty', (): void => {
            expect((): string|string[] => Names.normalizeOrThrow(['BLAH', '    '])).toThrowError('Cannot normalize an empty string.');
        });
    });

    describe('tryNormalize static method', (): void => {
        it('should normalize a string', (): void => {
            expect(Names.tryNormalize('Some String')).toBe('somestring');
        });

        it('should return undefined for an empty string', (): void => {
            expect(Names.tryNormalize('   ')).toBeUndefined();
        });

        it('should silently omit any elements that cannot be normalized', (): void => {
            expect(Names.tryNormalize(['BLAH', '   ', 'Some name with spaces and punctuation!', '   ', 'this-is-a-test'])).toEqual([
                'blah', 'somenamewithspacesandpunctuation', 'thisisatest',
            ]);
        });

        it('should return undefined if the resulting array has no strings', (): void => {
            expect(Names.tryNormalize([])).toBe(undefined);
            expect(Names.tryNormalize([' ', '    '])).toBe(undefined);
        });
    });

    describe('name list matching', () => {
        const matchingSingleString: [string[], string][] = [
            [['apple', 'berry'], 'apple'],
            [['apple', 'berry'], 'berry'],
            [['apple', 'berry'], 'APPLE'], // lookingFor is normalized
        ];
        const matchingMultiString: [string[], string[]][] = [
            [['alpha', 'bravo', 'charlie'], ['echo', 'delta', 'charlie']],
            [['alpha', 'bravo', 'charlie'], ['echo', 'delta', 'cHARlie']],
        ];
        const noMatchSingleString: [string[]|undefined, string][] = [
            [['alpha', 'beta'], 'zeta'],
            [['alpha', 'BETA'], 'beta'], // choices are not normalized
        ];
        const defaultMatchSingleString: [string[]|undefined, string][] = [
            [[], 'alpha'],
            [undefined, 'alpha'],
            [[], ''],
        ];
        const noMatchMultiString: [string[]|undefined, string[]][] = [
            [['alpha', 'bravo', 'charlie'], ['foxtrot', 'echo', 'delta']],
            [['alpha', 'bravo', 'CHARLIE'], ['echo', 'delta', 'charlie']],
        ];
        const defaultMatchMultiString: [string[]|undefined, string[]][] = [
            [[], ['foxtrot', 'echo', 'delta']],
            [undefined, ['echo', 'delta', 'charlie']],
        ];

        describe('isListed static method', () => {
            it('should return true if a single supplied string value is present normalized in the choices', () => {
                matchingSingleString.forEach((t) => {
                    expect(Names.isListed(t[0], t[1])).toBe(true);
                });
            });

            it('should return true if any of the supplied string values are present normalized in the choices', () => {
                matchingMultiString.forEach((t) => {
                    expect(Names.isListed(t[0], t[1])).toBe(true);
                });
            });

            it('should return false if a single supplied string value is not present normalized in the choices', () => {
                [...noMatchSingleString, ...defaultMatchSingleString].forEach((t) => {
                    expect(Names.isListed(t[0], t[1])).toBe(false);
                });
            });

            it('should return false if none of the supplied string values are present normalized in the choices', () => {
                [...noMatchMultiString, ...defaultMatchMultiString].forEach((t) => {
                    expect(Names.isListed(t[0], t[1])).toBe(false);
                });
            });
        });

        describe('isDefault static method', () => {
            it('should return true if choices are empty or undefined', () => {
                expect(Names.isDefault([])).toBe(true);
                expect(Names.isDefault(undefined)).toBe(true);
            });

            it('should return false if there are any choices', () => {
                expect(Names.isDefault(['hello'])).toBe(false);
            });
        });

        describe('isListedOrDefault static method', () => {
            it('should return true if a single string is matched or choices are default', () => {
                [...matchingSingleString, ...defaultMatchSingleString].forEach((t) => {
                    expect(Names.isListedOrDefault(t[0], t[1])).toBe(true);
                });
            });

            it('should return true if any supplied string matches or choices are default', () => {
                [...matchingMultiString, ...defaultMatchMultiString].forEach((t) => {
                    expect(Names.isListedOrDefault(t[0], t[1])).toBe(true);
                });
            });

            it('should return false if a single supplied string value does not match and there is at least one choice', () => {
                noMatchSingleString.forEach((t) => {
                    expect(Names.isListedOrDefault(t[0], t[1])).toBe(false);
                });
            });

            it('should return false if none of the supplied string values does not match and there is at least one choice', () => {
                noMatchMultiString.forEach((t) => {
                    expect(Names.isListedOrDefault(t[0], t[1])).toBe(false);
                });
            });
        });
    });
});
