'use strict';

import { Names } from '../../src/names';

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

    describe('validateName static method', (): void => {
        it('should return for non-empty, non-whitespace strings', (): void => {
            ['s', '_', '1'].forEach((str: string): void => {
                expect((): void => Names.validateName(str, 'some field')).not.toThrow();
            });
        });

        it('should throw for empty strings or whitespace strings', (): void => {
            ['', undefined, '   '].forEach((str: string): void => {
                expect((): void => Names.validateName(str, 'some field')).toThrowError(/must be non-empty/i);
            });
        });

        it('should include the field name in the error description', (): void => {
            ['some field', 'name', 'location'].forEach((desc: string): void => {
                expect((): void => Names.validateName('  ', desc)).toThrowError(new RegExp(`^.*${desc}.*$`));
            });
        });
    });


    describe('validateNames static method', (): void => {
        it('should return for any iterable containing non-empty, non-whitespace strings', (): void => {
            const good = ['s', '_', '1'];
            expect((): void => Names.validateNames(good, 'some field')).not.toThrow();
            expect((): void => Names.validateNames(new Set(good), 'some field')).not.toThrow();
        });

        it('should throw for any iterable containin empty strings or whitespace strings', (): void => {
            const bad = ['', undefined, '   '];
            expect((): void => Names.validateNames(bad, 'some field')).toThrow(/must be non-empty/i);
            expect((): void => Names.validateNames(new Set(bad), 'some field')).toThrow(/must be non-empty/i);
        });

        it('should include the field name in the error description', (): void => {
            const bad = ['', undefined, '   '];
            ['some field', 'name', 'location'].forEach((desc: string): void => {
                expect((): void => Names.validateNames(bad, desc)).toThrowError(new RegExp(`^.*${desc}.*$`));
            });
        });

        it('should enforce mininmum length constraint, if present', (): void => {
            const good = ['s', '_', '1'];
            for (let i = 0; i <= good.length; i++) {
                expect((): void => Names.validateNames(good, 'some field', i)).not.toThrowError();
            }

            expect((): void => Names.validateNames(good, 'some field', good.length + 1)).toThrowError(/at least/i);
        });
    });

    describe('normalize static method', (): void => {
        it('should normalize a string', (): void => {
            expect(Names.normalize('Some String')).toBe('somestring');
        });

        it('should throw for an empty string', (): void => {
            expect((): string|string[] => Names.normalize('   ')).toThrowError('Cannot normalize an empty string.');
        });

        it('should throw for anything but string or array', (): void => {
            [
                {}, true, 11, undefined, null, (): boolean => true,
            ].forEach((badParam): void => {
                expect(() => Names.normalize(badParam as string)).toThrowError(/cannot normalize an input of type/i);
            });
        });

        it('should normalize all strings in an array', (): void => {
            expect(Names.normalize(['BLAH', 'Some name with spaces and punctuation!', 'this-is-a-test'])).toEqual([
                'blah', 'somenamewithspacesandpunctuation', 'thisisatest',
            ]);
        });

        it('should throw if any strings are empty', (): void => {
            expect((): string|string[] => Names.normalize(['BLAH', '    '])).toThrowError('Cannot normalize an empty string.');
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
});
