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
import * as Merge from '../../../src/utils/merge';
import { Names } from '../../../src/names/names';

describe('Merge module', () => {
    const itemMergeOptions: (Merge.MergeOptions|undefined)[] = [
        undefined,
        { onItemCollision: 'keepExisting', onArrayCollision: 'keepExisting', onUnknownField: 'error' },
        { onItemCollision: 'replace', onArrayCollision: 'replace', onUnknownField: 'error' },
        { onItemCollision: 'error', onArrayCollision: 'error', onUnknownField: 'error' },
    ];

    describe('item merger', () => {
        const item = Merge.item<string>();
        describe('with base value present', () => {
            it('should return the base value with "keepExisting"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'keepExisting',
                    onArrayCollision: 'keepExisting',
                    onUnknownField: 'error',
                };
                const result = item.merge('string1', 'string2', options);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toBe('string1');
                }
            });

            it('should return the new value with "replace"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'replace',
                    onArrayCollision: 'replace',
                    onUnknownField: 'error',
                };
                const result = item.merge('string1', 'string2', options);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toBe('string2');
                }
            });

            it('should return the new value by default', () => {
                const result = item.merge('string1', 'string2');
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toBe('string2');
                }
            });

            it('should fail with "error"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'error',
                    onArrayCollision: 'error',
                    onUnknownField: 'error',
                };
                const result = item.merge('string1', 'string2', options);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/unable to replace/i);
                }
            });
        });

        describe('with base value missing', () => {
            it('should return the new value regardless of item merge option', () => {
                itemMergeOptions.forEach((options) => {
                    const result = item.merge(undefined, 'string2', options);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toBe('string2');
                    }
                });
            });
        });

        describe('with merge value missing', () => {
            const optionalItem = Merge.item<string|undefined>();
            it('should return the base value regardless of item merge option', () => {
                itemMergeOptions.forEach((options) => {
                    const result = optionalItem.merge('string1', undefined, options);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toBe('string1');
                    }
                });
            });
        });
    });

    describe('mergeArray function', () => {
        const array = Merge.array<string>();
        describe('with base value present', () => {
            it('should return the base value with "keepExisting"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'keepExisting',
                    onArrayCollision: 'keepExisting',
                    onUnknownField: 'error',
                };
                const result = array.merge(['string1'], ['string2'], options);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(['string1']);
                }
            });

            it('should return the new value with "replace"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'replace',
                    onArrayCollision: 'replace',
                    onUnknownField: 'error',
                };
                const result = array.merge(['string1'], ['string2'], options);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(['string2']);
                }
            });

            it('should return the new value by default', () => {
                const result = array.merge(['string1'], ['string2']);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(['string2']);
                }
            });

            it('should merge the base and new values for "merge', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'keepExisting',
                    onArrayCollision: 'merge',
                    onUnknownField: 'error',
                };
                const result = array.merge(['string1'], ['string2'], options);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(['string1', 'string2']);
                }
            });

            it('should remove duplicate values for "merge', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'keepExisting',
                    onArrayCollision: 'merge',
                    onUnknownField: 'error',
                };
                const result = array.merge(['string1', 'string2'], ['string2', 'string3'], options);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(['string1', 'string2', 'string3']);
                }
            });

            it('should fail with "error"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'error',
                    onArrayCollision: 'error',
                    onUnknownField: 'error',
                };
                const result = array.merge(['string1'], ['string2'], options);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/unable to replace/i);
                }
            });
        });

        describe('with base value missing', () => {
            it('should return the new value regardless of item merge option', () => {
                itemMergeOptions.forEach((options) => {
                    let result = array.merge(undefined, ['string2'], options);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toEqual(['string2']);
                    }

                    result = array.merge([], ['string2'], options);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toEqual(['string2']);
                    }
                });
            });
        });

        describe('with merge value missing or empty', () => {
            it('should return the base value regardless of item merge option', () => {
                itemMergeOptions.forEach((options) => {
                    let result = array.merge(['string1'], undefined, options);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toEqual(['string1']);
                    }

                    result = array.merge(['string1'], [], options);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toEqual(['string1']);
                    }
                });
            });
        });
    });

    describe('normalizedString merger', () => {
        it('should normalize the string during merge', () => {
            const mergeValue = '  Merged Value_1';
            const result = Merge.normalizedString.merge('base', mergeValue);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toBe(Names.normalizeOrThrow(mergeValue));
            }
        });

        it('should return the base value unmodified for undefined', () => {
            const baseValue = 'Base Value';
            const result = Merge.normalizedString.merge(baseValue, undefined);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toBe(baseValue);
            }
        });

        it('should fail if the merged string is invalid', () => {
            const baseValue = 'Base Value';
            const result = Merge.normalizedString.merge(baseValue, '    ');
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/cannot normalize/i);
            }
        });
    });

    describe('normalizedStringArray merger', () => {
        it('should normalize all strings during merge', () => {
            const mergeValues = ['  Merged Value_1', 'MERGE2'];
            const normalizedMergeValues = mergeValues.map((n) => Names.normalizeOrThrow(n));
            const result = Merge.normalizedStringArray.merge(['base'], mergeValues);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(normalizedMergeValues);
            }
        });

        it('should return the base value unmodified for undefined or empty array', () => {
            const baseValue = ['Base Value1', 'Base Value 2'];
            let result = Merge.normalizedStringArray.merge(baseValue, undefined);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toBe(baseValue);
            }

            result = Merge.normalizedStringArray.merge(baseValue, []);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toBe(baseValue);
            }
        });

        it('should fail if the merged string is invalid', () => {
            const baseValue = ['Base Value 1', 'Base Value 2'];
            const result = Merge.normalizedStringArray.merge(baseValue, ['Okay', '    ']);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/cannot normalize/i);
            }
        });
    });

    describe('ObjectMerger class', () => {
        interface Thing {
            numberField: number;
            booleanField: boolean;
            stringField: string;
            normalizedStringField: string;
            optionalStringField?: string;
            arrayOfStringsField?: string[];
            normalizedArrayOfStringsField?: string[];
        }
        const fieldMergers: Merge.FieldMergers<Thing, Merge.MergeOptions> = {
            mergers: {
                numberField: Merge.number,
                booleanField: Merge.boolean,
                stringField: Merge.string,
                normalizedStringField: Merge.normalizedString,
                optionalStringField: Merge.optionalString,
                arrayOfStringsField: Merge.stringArray,
                normalizedArrayOfStringsField: Merge.normalizedStringArray,
            },
        };
        const base: Thing = {
            numberField: -1,
            booleanField: false,
            stringField: 'base string',
            normalizedStringField: 'normalizedbase',
            arrayOfStringsField: ['base string 1'],
            normalizedArrayOfStringsField: ['normalizedbasestring1'],
        };
        const successTests: { merge: Partial<Thing>; expect: Thing }[] = [
            {
                merge: { numberField: 10 },
                expect: { ...base, numberField: 10 },
            },
            {
                merge: {
                    normalizedStringField: undefined,
                    normalizedArrayOfStringsField: undefined,
                },
                expect: base,
            },
        ];
        const errorTests: { merge: Partial<Thing>; expect: RegExp }[] = [
            {
                merge: { normalizedStringField: '    ' },
                expect: /unable to merge/i,
            },
        ];

        const object = new Merge.ObjectMerger(fieldMergers);

        describe('mergeInPlace method', () => {
            it('should merge correctly into the supplied object', () => {
                for (const t of successTests) {
                    const mergeInto: Thing = { ...base };
                    const result = object.mergeInPlace(mergeInto, t.merge);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toBe(mergeInto);
                        expect(result.value).toEqual(t.expect);
                    }
                }
            });

            it('should report errors without modifying base if objects cannot be merged', () => {
                for (const t of errorTests) {
                    const mergeInto: Thing = { ...base };
                    const result = object.mergeInPlace(mergeInto, t.merge);
                    expect(result.isFailure()).toBe(true);
                    if (result.isFailure()) {
                        expect(result.message).toMatch(t.expect);
                        expect(mergeInto).toEqual(base);
                    }
                }
            });

            describe('with an incomplete set of mergers', () => {
                const incompleteMergers: Merge.FieldMergers<Thing, Merge.MergeOptions> = {
                    options: Merge.defaultMergeOptions,
                    mergers: {
                        stringField: Merge.string,
                        normalizedStringField: Merge.normalizedString,
                    },
                };
                const partial = new Merge.ObjectMerger(incompleteMergers);

                it('should succeed if mergers are defined for all fields to be merged', () => {
                    const mergeInto: Thing = { ...base };
                    const result = partial.mergeInPlace(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                    });
                    const expected: Thing = {
                        ...base,
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'newstringinpartialmerge',
                    };

                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toEqual(expected);
                        expect(mergeInto).toEqual(expected);
                    }
                });

                it('should fail with default options if no merger is defined for one of the fields to be merged', () => {
                    const mergeInto: Thing = { ...base };
                    const result = partial.mergeInPlace(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                        numberField: 42,
                    });

                    expect(result.isFailure()).toBe(true);
                    if (result.isFailure()) {
                        expect(result.message).toMatch(/no merge method/i);
                        expect(mergeInto).toEqual(base);
                    }
                });

                it('should ignore fields with no mergers if onUnknownField is ignore', () => {
                    const mergeInto: Thing = { ...base };
                    const result = partial.mergeInPlace(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                        numberField: 42,
                    }, {
                        ...Merge.defaultMergeOptions,
                        onUnknownField: 'ignore',
                    });
                    const expected: Thing = {
                        ...base,
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'newstringinpartialmerge',
                    };

                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(mergeInto).toEqual(expected);
                    }
                });
            });
        });

        describe('MergeIntoCopy method', () => {
            it('should merge correctly into a new object object', () => {
                for (const t of successTests) {
                    const immutableBase: Thing = { ...base };
                    const result = object.mergeIntoCopy(immutableBase, t.merge);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).not.toBe(immutableBase);
                        expect(result.value).toEqual(t.expect);
                        expect(immutableBase).toEqual(base);
                    }
                }
            });

            it('should report errors without modifying base if objects cannot be merged', () => {
                for (const t of errorTests) {
                    const immutableBase: Thing = { ...base };
                    const result = object.mergeIntoCopy(immutableBase, t.merge);
                    expect(result.isFailure()).toBe(true);
                    if (result.isFailure()) {
                        expect(result.message).toMatch(t.expect);
                    }
                }
            });

            describe('with an incomplete set of mergers', () => {
                const incompleteMergers: Merge.FieldMergers<Thing, Merge.MergeOptions> = {
                    options: Merge.defaultMergeOptions,
                    mergers: {
                        stringField: Merge.string,
                        normalizedStringField: Merge.normalizedString,
                    },
                };
                const partial = new Merge.ObjectMerger(incompleteMergers);

                it('should succeed if mergers are defined for all fields to be merged', () => {
                    const mergeInto: Thing = { ...base };
                    const result = partial.mergeIntoCopy(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                    });
                    const expected: Thing = {
                        ...base,
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'newstringinpartialmerge',
                    };

                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toEqual(expected);
                        expect(mergeInto).toEqual(base);
                    }
                });

                it('should fail by default if no merger is defined for one of the fields to be merged', () => {
                    const mergeInto: Thing = { ...base };
                    const result = partial.mergeIntoCopy(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                        numberField: 42,
                    });

                    expect(result.isFailure()).toBe(true);
                    if (result.isFailure()) {
                        expect(result.message).toMatch(/no merge method/i);
                        expect(mergeInto).toEqual(base);
                    }
                });

                it('should ignore fields with no mergers if onUnknownField is ignore', () => {
                    const mergeInto: Thing = { ...base };
                    const result = partial.mergeIntoCopy(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                        numberField: 42,
                    }, {
                        ...Merge.defaultMergeOptions,
                        onUnknownField: 'ignore',
                    });
                    const expected: Thing = {
                        ...base,
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'newstringinpartialmerge',
                    };

                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toEqual(expected);
                        expect(mergeInto).not.toEqual(expected);
                    }
                });
            });
        });
    });
});
