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
import { Merge } from '../../../src/utils';
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
            test('returns the base value with "keepExisting"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'keepExisting',
                    onArrayCollision: 'keepExisting',
                    onUnknownField: 'error',
                };
                expect(item.merge('string1', 'string2', options))
                    .toSucceedWith('string1');
            });

            test('returns the new value with "replace"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'replace',
                    onArrayCollision: 'replace',
                    onUnknownField: 'error',
                };
                expect(item.merge('string1', 'string2', options))
                    .toSucceedWith('string2');
            });

            test('returns the new value by default', () => {
                expect(item.merge('string1', 'string2'))
                    .toSucceedWith('string2');
            });

            test('fails with "error"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'error',
                    onArrayCollision: 'error',
                    onUnknownField: 'error',
                };
                expect(item.merge('string1', 'string2', options))
                    .toFailWith(/unable to replace/i);
            });
        });

        describe('with base value missing', () => {
            test('returns the new value regardless of item merge option', () => {
                itemMergeOptions.forEach((options) => {
                    expect(item.merge(undefined, 'string2', options))
                        .toSucceedWith('string2');
                });
            });
        });

        describe('with merge value missing', () => {
            const optionalItem = Merge.item<string|undefined>();
            test('returns the base value regardless of item merge option', () => {
                itemMergeOptions.forEach((options) => {
                    expect(optionalItem.merge('string1', undefined, options))
                        .toSucceedWith('string1');
                });
            });
        });
    });

    describe('mergeArray function', () => {
        const array = Merge.array<string>();
        describe('with base value present', () => {
            test('returns the base value with "keepExisting"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'keepExisting',
                    onArrayCollision: 'keepExisting',
                    onUnknownField: 'error',
                };
                expect(array.merge(['string1'], ['string2'], options))
                    .toSucceedWith(['string1']);
            });

            test('returns the new value with "replace"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'replace',
                    onArrayCollision: 'replace',
                    onUnknownField: 'error',
                };
                expect(array.merge(['string1'], ['string2'], options))
                    .toSucceedWith(['string2']);
            });

            test('returns the new value by default', () => {
                expect(array.merge(['string1'], ['string2']))
                    .toSucceedWith(['string2']);
            });

            test('merges the base and new values for "merge', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'keepExisting',
                    onArrayCollision: 'merge',
                    onUnknownField: 'error',
                };

                expect(array.merge(['string1'], ['string2'], options))
                    .toSucceedWith(['string1', 'string2']);
            });

            test('removes duplicate values for "merge', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'keepExisting',
                    onArrayCollision: 'merge',
                    onUnknownField: 'error',
                };

                expect(array.merge(['string1', 'string2'], ['string2', 'string3'], options))
                    .toSucceedWith(['string1', 'string2', 'string3']);
            });

            test('fails with "error"', () => {
                const options: Merge.MergeOptions = {
                    onItemCollision: 'error',
                    onArrayCollision: 'error',
                    onUnknownField: 'error',
                };

                expect(array.merge(['string1'], ['string2'], options))
                    .toFailWith(/unable to replace/i);
            });
        });

        describe('with base value missing', () => {
            test('returns the new value regardless of item merge option', () => {
                itemMergeOptions.forEach((options) => {
                    expect(array.merge(undefined, ['string2'], options))
                        .toSucceedWith(['string2']);

                    expect(array.merge([], ['string2'], options))
                        .toSucceedWith(['string2']);
                });
            });
        });

        describe('with merge value missing or empty', () => {
            test('returns the base value regardless of item merge option', () => {
                itemMergeOptions.forEach((options) => {
                    expect(array.merge(['string1'], undefined, options))
                        .toSucceedWith(['string1']);

                    expect(array.merge(['string1'], [], options))
                        .toSucceedWith(['string1']);
                });
            });
        });
    });

    describe('normalizedString merger', () => {
        test('normalizes the string during merge', () => {
            const mergeValue = '  Merged Value_1';
            expect(Merge.normalizedString.merge('base', mergeValue))
                .toSucceedWith(Names.normalizeOrThrow(mergeValue));
        });

        test('returns the base value unmodified for undefined', () => {
            const baseValue = 'Base Value';
            expect(Merge.normalizedString.merge(baseValue, undefined))
                .toSucceedWith(baseValue);
        });

        test('fails if the merged string is invalid', () => {
            const baseValue = 'Base Value';
            expect(Merge.normalizedString.merge(baseValue, '    '))
                .toFailWith(/cannot normalize/i);
        });
    });

    describe('normalizedStringArray merger', () => {
        test('normalizes all strings during merge', () => {
            const mergeValues = ['  Merged Value_1', 'MERGE2'];
            const normalizedMergeValues = mergeValues.map((n) => Names.normalizeOrThrow(n));
            expect(Merge.normalizedStringArray.merge(['base'], mergeValues))
                .toSucceedWith(normalizedMergeValues);
        });

        test('returns the base value unmodified for undefined or empty array', () => {
            const baseValue = ['Base Value1', 'Base Value 2'];
            expect(Merge.normalizedStringArray.merge(baseValue, undefined))
                .toSucceedWith(baseValue);

            expect(Merge.normalizedStringArray.merge(baseValue, []))
                .toSucceedWith(baseValue);
        });

        test('fails if the merged string is invalid', () => {
            const baseValue = ['Base Value 1', 'Base Value 2'];
            expect(Merge.normalizedStringArray.merge(baseValue, ['Okay', '    ']))
                .toFailWith(/cannot normalize/i);
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
        function cloneThing(thing?: Thing): Thing {
            return { ... (thing ?? base) };
        }

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

        const object = new Merge.ObjectMerger(fieldMergers, cloneThing);

        describe('mergeInPlace method', () => {
            test('merges correctly into the supplied object', () => {
                for (const t of successTests) {
                    const mergeInto: Thing = { ...base };
                    expect(object.mergeInPlace(mergeInto, t.merge)).toSucceedAndSatisfy((got: Thing) => {
                        expect(got).toBe(mergeInto);
                        expect(got).toEqual(t.expect);
                    });
                }
            });

            test('reports errors without modifying base if objects cannot be merged', () => {
                for (const t of errorTests) {
                    const mergeInto: Thing = { ...base };
                    expect(object.mergeInPlace(mergeInto, t.merge)).toFailWith(t.expect);
                    expect(mergeInto).toEqual(base);
                }
            });

            test('fails if the base object is undefined', () => {
                expect(object.mergeInPlace(undefined as unknown as Thing, base)).toFailWith(/undefined base object/i);
            });

            describe('with an incomplete set of mergers', () => {
                const incompleteMergers: Merge.FieldMergers<Thing, Merge.MergeOptions> = {
                    options: Merge.defaultMergeOptions,
                    mergers: {
                        stringField: Merge.string,
                        normalizedStringField: Merge.normalizedString,
                    },
                };
                const partial = new Merge.ObjectMerger(incompleteMergers, cloneThing);

                test('succeeds if mergers are defined for all fields to be merged', () => {
                    const mergeInto: Thing = { ...base };
                    const expected: Thing = {
                        ...base,
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'newstringinpartialmerge',
                    };

                    expect(partial.mergeInPlace(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                    })).toSucceedAndSatisfy((got: Thing) => {
                        expect(got).toEqual(expected);
                        expect(mergeInto).toEqual(expected);
                    });
                });

                test('fails with default options if no merger is defined for one of the fields to be merged', () => {
                    const mergeInto: Thing = { ...base };

                    expect(partial.mergeInPlace(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                        numberField: 42,
                    })).toFailWith(/no merge method/i);

                    expect(mergeInto).toEqual(base);
                });

                test('ignores fields with no mergers if onUnknownField is ignore', () => {
                    const mergeInto: Thing = { ...base };
                    const expected: Thing = {
                        ...base,
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'newstringinpartialmerge',
                    };

                    expect(partial.mergeInPlace(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                        numberField: 42,
                    }, {
                        ...Merge.defaultMergeOptions,
                        onUnknownField: 'ignore',
                    })).toSucceedWith(expected);
                });
            });
        });

        describe('MergeIntoCopy method', () => {
            test('merges correctly into a new object', () => {
                for (const t of successTests) {
                    const immutableBase: Thing = { ...base };

                    expect(object.mergeIntoCopy(immutableBase, t.merge)).toSucceedAndSatisfy((got: Thing) => {
                        expect(got).not.toBe(immutableBase);
                        expect(got).toEqual(t.expect);
                        expect(immutableBase).toEqual(base);
                    });
                }
            });

            test('reports errors without modifying base if objects cannot be merged', () => {
                for (const t of errorTests) {
                    const immutableBase: Thing = { ...base };
                    expect(object.mergeIntoCopy(immutableBase, t.merge))
                        .toFailWith(t.expect);
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
                const partial = new Merge.ObjectMerger(incompleteMergers, cloneThing);

                test('succeeds if mergers are defined for all fields to be merged', () => {
                    const mergeInto: Thing = { ...base };
                    const expected: Thing = {
                        ...base,
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'newstringinpartialmerge',
                    };

                    expect(partial.mergeIntoCopy(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                    })).toSucceedWith(expected);

                    expect(mergeInto).toEqual(base);
                });

                test('fails by default if no merger is defined for one of the fields to be merged', () => {
                    const mergeInto: Thing = { ...base };

                    expect(partial.mergeIntoCopy(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                        numberField: 42,
                    })).toFailWith(/no merge method/i);

                    expect(mergeInto).toEqual(base);
                });

                test('ignores fields with no mergers if onUnknownField is ignore', () => {
                    const mergeInto: Thing = { ...base };
                    const expected: Thing = {
                        ...base,
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'newstringinpartialmerge',
                    };

                    expect(partial.mergeIntoCopy(mergeInto, {
                        stringField: 'NEW STRING IN PARTIAL MERGE',
                        normalizedStringField: 'NEW STRING IN PARTIAL MERGE',
                        numberField: 42,
                    }, {
                        ...Merge.defaultMergeOptions,
                        onUnknownField: 'ignore',
                    })).toSucceedWith(expected);

                    expect(mergeInto).not.toEqual(expected);
                });
            });
        });
    });
});
