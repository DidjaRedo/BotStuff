import * as Converter from '../../src/converter';
import { Failure, Result, Success } from '../../src/result';

describe('converters module', () => {
    describe('Converter class', () => {
        describe('convertOptional method', () => {
            it('should ignore errors by default', () => {
                expect(Converter.string.convertOptional(true).isSuccess()).toBe(true);
            });
        });

        describe('optional method', () => {
            describe('with failOnError', () => {
                const optionalString = Converter.string.optional('failOnError');

                it('should convert a valid value  or undefined as expected', () => {
                    ['a string', '', 'true', '10', undefined].forEach((v) => {
                        const result = optionalString.convert(v);
                        expect(result.isSuccess()).toBe(true);
                        if (result.isSuccess()) {
                            expect(result.value).toEqual(v);
                        }
                    });
                });
                it('should fail for an invalid value', () => {
                    [10, true, [], (): string => 'hello'].forEach((v) => {
                        const result = optionalString.convert(v);
                        expect(result.isFailure()).toBe(true);
                        if (result.isFailure()) {
                            expect(result.message).toMatch(/not a string/i);
                        }
                    });
                });
            });

            describe('with ignoreErrors', () => {
                const optionalString = Converter.string.optional('ignoreErrors');

                it('should convert a valid value or undefined as expected', () => {
                    ['a string', '', 'true', '10', undefined].forEach((v) => {
                        const result = optionalString.convert(v);
                        expect(result.isSuccess()).toBe(true);
                        if (result.isSuccess()) {
                            expect(result.value).toEqual(v);
                        }
                    });
                });
                it('should succeed and return undefined for an invalid value', () => {
                    [10, true, [], (): string => 'hello'].forEach((v) => {
                        const result = optionalString.convert(v);
                        expect(result.isSuccess()).toBe(true);
                        if (result.isSuccess()) {
                            expect(result.value).toBeUndefined();
                        }
                    });
                });
            });

            describe('with default conversion', () => {
                it('should ignore errors', () => {
                    const optionalString = Converter.string.optional();
                    expect(optionalString.convert(true).isSuccess()).toBe(true);
                });
            });
        });

        describe('map method', () => {
            const targetString = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const mapper = (count: number): Result<string> => {
                if ((count > 0) && (count < targetString.length)) {
                    return new Success(targetString.substring(0, count));
                }
                return new Failure<string>(`Count ${count} is out of range.`);
            };
            const converter = Converter.number.map(mapper);

            it('should apply a mapping function to a sucessful conversion', () => {
                const result = converter.convert(3);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(targetString.substring(0, 3));
                }
            });

            it('should report a mapping failure for an otherwise successful conversion', () => {
                const result = converter.convert(-1);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/out of range/i);
                }
            });

            it('should report a conversion failure without applying the mapping function', () => {
                const result = converter.convert('test');
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/not a number/i);
                }
            });
        });

        describe('withConstraint method', () => {
            describe('with a boolean constraint', () => {
                const constrained = Converter.number.withConstraint((n) => n >= 0 && n <= 100);
                it('should convert a valid value as expected', () => {
                    [0, 100, '50'].forEach((v) => {
                        const result = constrained.convert(v);
                        expect(result.isSuccess()).toBe(true);
                        if (result.isSuccess()) {
                            expect(result.value).toEqual(Number(v));
                        }
                    });
                });

                it('should fail for an otherwise valid value that does not meet a boolean constraint', () => {
                    [-1, 200, '101'].forEach((v) => {
                        const result = constrained.convert(v);
                        expect(result.isFailure()).toBe(true);
                        if (result.isFailure()) {
                            expect(result.message).toMatch(/constraint/i);
                        }
                    });
                });

                it('should propagate the error for an invalid value', () => {
                    ['hello', {}, true].forEach((v) => {
                        const result = constrained.convert(v);
                        expect(result.isFailure()).toBe(true);
                        if (result.isFailure()) {
                            expect(result.message).toMatch(/not a number/i);
                        }
                    });
                });
            });

            describe('with a Result constraint', () => {
                const constrained = Converter.number.withConstraint((n) => {
                    return (n >= 0 && n <= 100) ? new Success(n) : new Failure('out of range');
                });

                it('should convert a valid value as expected', () => {
                    [0, 100, '50'].forEach((v) => {
                        const result = constrained.convert(v);
                        expect(result.isSuccess()).toBe(true);
                        if (result.isSuccess()) {
                            expect(result.value).toEqual(Number(v));
                        }
                    });
                });

                it('should fail for an otherwise valid value that does not meet a result constraint', () => {
                    [-1, 200, '101'].forEach((v) => {
                        const result = constrained.convert(v);
                        expect(result.isFailure()).toBe(true);
                        if (result.isFailure()) {
                            expect(result.message).toMatch(/out of range/i);
                        }
                    });
                });

                it('should propagate the error for an invalid value', () => {
                    ['hello', {}, true].forEach((v) => {
                        const result = constrained.convert(v);
                        expect(result.isFailure()).toBe(true);
                        if (result.isFailure()) {
                            expect(result.message).toMatch(/not a number/i);
                        }
                    });
                });
            });
        });
    });

    describe('string converter', () => {
        it('should convert valid strings', () => {
            ['A string', '1', 'true', ''].forEach((s) => {
                const result = Converter.string.convert(s);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(s);
                }
            });
        });

        it('should fail for non-string values strings', () => {
            [1, true, {}, (): string => 'hello', ['true']].forEach((v) => {
                const result = Converter.string.convert(v);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/not a string/i);
                }
            });
        });
    });

    describe('number converter', () => {
        it('should convert valid numbers and numeric strings', () => {
            [-1, 0, 10, '100', '0', '-10'].forEach((v) => {
                const result = Converter.number.convert(v);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toEqual(Number(v));
                }
            });
        });

        it('should fail for non-numbers and numeric strings', () => {
            ['test', true, '10der', '100 tests', {}, [], (): number => 100].forEach((v) => {
                const result = Converter.number.convert(v);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/not a number/i);
                }
            });
        });
    });

    describe('boolean converter', () => {
        it('should convert booleans and boolean strings', () => {
            [true, 'true', 'TRUE', 'True'].forEach((v) => {
                const result = Converter.boolean.convert(v);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toBe(true);
                }
            });

            [false, 'false', 'FALSE', 'False'].forEach((v) => {
                const result = Converter.boolean.convert(v);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toBe(false);
                }
            });
        });

        it('should fail for non-booleans or non-boolean strings', () => {
            [1, 0, -1, {}, [], (): boolean => true, 'truthy', 'f', 't'].forEach((v) => {
                const result = Converter.boolean.convert(v);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/not a boolean/i);
                }
            });
        });
    });

    describe('oneOf converter', () => {
        describe('with onError set to ignoreOrrors', () => {
            const stringFirst = Converter.oneOf<string|number>([Converter.string, Converter.number]);
            const numFirst = Converter.oneOf<string|number>([Converter.number, Converter.string]);

            it('should convert a value with the first converter that succeeds, ignoring errors', () => {
                [
                    { src: 'Test', expect: 'Test' },
                    { src: 10, expect: 10 },
                    { src: '100', expect: '100' },
                ].forEach((t) => {
                    const result = stringFirst.convert(t.src);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toBe(t.expect);
                    }
                });

                [
                    { src: 'Test', expect: 'Test' },
                    { src: 10, expect: 10 },
                    { src: '100', expect: 100 },
                ].forEach((t) => {
                    const result = numFirst.convert(t.src);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toBe(t.expect);
                    }
                });
            });

            it('should fail if none of the converters can handle the value', () => {
                const result = numFirst.convert(true);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/no matching decoder/i);
                }
            });
        });

        describe('with onError set to failOnError', () => {
            const stringFirst = Converter.oneOf<string|number>([
                Converter.string,
                Converter.number,
            ], 'failOnError');
            const numFirst = Converter.oneOf<string|number>([
                Converter.number,
                Converter.string,
            ], 'failOnError');
            const optionalStringFirst = Converter.oneOf<string|number>([
                Converter.string.optional('ignoreErrors'),
                Converter.number,
            ], 'failOnError');
            const optionalNumFirst = Converter.oneOf<string|number>([
                Converter.number.optional('ignoreErrors'),
                Converter.string,
            ], 'failOnError');
            const allOptionalNumFirst = Converter.oneOf<string|number>([
                Converter.number.optional('ignoreErrors'),
                Converter.string.optional('ignoreErrors'),
            ], 'failOnError');

            it('should convert a value with the first converter that returns undefined', () => {
                [
                    { src: 'Test', expect: 'Test' },
                    { src: 10, expect: 10 },
                    { src: '100', expect: '100' },
                ].forEach((t) => {
                    const result = optionalStringFirst.convert(t.src);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toBe(t.expect);
                    }
                });

                [
                    { src: 'Test', expect: 'Test' },
                    { src: 10, expect: 10 },
                    { src: '100', expect: 100 },
                ].forEach((t) => {
                    const result = optionalNumFirst.convert(t.src);
                    expect(result.isSuccess()).toBe(true);
                    if (result.isSuccess()) {
                        expect(result.value).toBe(t.expect);
                    }
                });
            });

            it('should fail if any of the converters return an error', () => {
                [
                    { src: 10, expect: /not a string/i },
                ].forEach((t) => {
                    const result = stringFirst.convert(t.src);
                    expect(result.isFailure()).toBe(true);
                    if (result.isFailure()) {
                        expect(result.message).toMatch(t.expect);
                    }
                });

                [
                    { src: 'Test', expect: /not a number/i },
                ].forEach((t) => {
                    const result = numFirst.convert(t.src);
                    expect(result.isFailure()).toBe(true);
                    if (result.isFailure()) {
                        expect(result.message).toMatch(t.expect);
                    }
                });
            });

            it('should fail if none of the converters can handle the value', () => {
                const result = allOptionalNumFirst.convert(true);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/no matching decoder/i);
                }
            });
        });
    });

    describe('array converter', () => {
        it('should convert a valid array', () => {
            const srcArray = ['s1', 's2', 's3'];
            const result = Converter.arrayOf(Converter.string).convert(srcArray);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(srcArray);
            }
        });

        it('should fail an array which contains values that cannot be converted if onError is "fail"', () => {
            const srcArray = ['s1', 's2', 's3', 10];
            const result = Converter.arrayOf(Converter.string, 'failOnError').convert(srcArray);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/not a string/i);
            }
        });

        it('should ignore values that cannot be converted if onError is "ignore"', () => {
            const validArray = ['s1', 's2', 's3'];
            const badArray = [100, ...validArray, 10];
            const result = Converter.arrayOf(Converter.string, 'ignoreErrors').convert(badArray);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(validArray);
            }
        });

        it('should default to onError="failOnError"', () => {
            expect(Converter.arrayOf(Converter.string).convert([true]).isFailure()).toBe(true);
        });

        it('should ignore undefined values returned by a converter', () => {
            const validArray = ['s1', 's2', 's3'];
            const badArray = [100, ...validArray, 10];
            const result = Converter.arrayOf(Converter.string.optional()).convert(badArray);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(validArray);
            }
        });

        it('should fail when converting a non-array', () => {
            const result = Converter.arrayOf(Converter.string).convert(123);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/not an array/i);
            }
        });
    });

    describe('recordOf converter', () => {
        it('should convert a valid object', () => {
            const srcObject = {
                p1: 's1',
                p2: 's2',
                p3: 's3',
            };
            const result = Converter.recordOf(Converter.string).convert(srcObject);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(srcObject);
            }
        });

        it('should fail an object which contains values that cannot be converted if onError is "fail"', () => {
            const srcObject = {
                p1: 's1',
                p2: 's2',
                p3: 's3',
                p4: 10,
            };
            const result = Converter.recordOf(Converter.string, 'fail').convert(srcObject);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/not a string/i);
            }
        });

        it('should ignore inherited or non-enumerable properties even if onError is "fail"', () => {
            function BaseObject(): void {
                this.p1 = 's1';
                this.p2 = 's2';
                this.p3 = 's3';
                Object.defineProperty(this, 'p4', { value: 10, enumerable: false });
            };
            BaseObject.prototype.base1 = 100;

            const srcObject = new BaseObject();

            // make sure our source object looks as expected
            expect(srcObject.base1).toBe(100);
            expect(srcObject.hasOwnProperty('base1')).toBe(false);
            expect(srcObject.p4).toBe(10);

            const result = Converter.recordOf(Converter.string, 'fail').convert(srcObject);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                const value = result.value as Record<string, unknown>;
                expect(value.p1).toEqual(srcObject.p1);
                expect(value.p2).toEqual(srcObject.p2);
                expect(value.p3).toEqual(srcObject.p3);
                expect(value.p4).toBeUndefined();
                expect(value.base1).toBeUndefined();
            }
        });

        it('should ignore values that cannot be converted if onError is "ignore"', () => {
            const validObject = {
                p1: 's1',
                p2: 's2',
                p3: 's3',
            };
            const badObject = { ...validObject, badField: 10 };
            const result = Converter.recordOf(Converter.string, 'ignore').convert(badObject);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(validObject);
            }
        });

        it('should default to onError="fail"', () => {
            expect(Converter.recordOf(Converter.string).convert({ bad: true }).isFailure()).toBe(true);
        });

        it('should ignore undefined values returned by a converter', () => {
            const validObject = {
                p1: 's1',
                p2: 's2',
                p3: 's3',
            };
            const badObject = { badField: 100, ...validObject };
            const result = Converter.recordOf(Converter.string.optional()).convert(badObject);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(validObject);
            }
        });

        it('should fail when converting a non-object', () => {
            const result = Converter.recordOf(Converter.string).convert(123);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/not a string-keyed object/i);
            }
        });
    });

    describe('field converter', () => {
        const getFirstString = Converter.field('first', Converter.string);
        const getSecondNumber = Converter.field('second', Converter.number);
        const good = { first: 'test', second: 10 };
        const bad = { furst: 10, second: 'test' };

        it('should succeed in converting a correctly-typed field that exists', () => {
            const result = getFirstString.convert(good);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(good.first);
            }
        });

        it('should fail for an incorrectly typed field', () => {
            const result = getSecondNumber.convert(bad);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/not a number/i);
            }
        });

        it('should fail for a non-existent field', () => {
            const result = getFirstString.convert(bad);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/field.*not found/i);
            }
        });

        it('should fail if the parameter is not an object', () => {
            ['hello', 10, true, (): string => 'hello', undefined].forEach((v) => {
                const result = getFirstString.convert(v);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/non-object/i);
                }
            });
        });
    });

    describe('optionalField converter', () => {
        const getFirstString = Converter.optionalField('first', Converter.string);
        const getSecondNumber = Converter.optionalField('second', Converter.number);
        const good = { first: 'test', second: 10 };
        const bad = { furst: 10, second: 'test' };

        it('should succeed in converting a correctly-typed field that exists', () => {
            const result = getFirstString.convert(good);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(good.first);
            }
        });

        it('should fail for an incorrectly typed field', () => {
            const result = getSecondNumber.convert(bad);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/not a number/i);
            }
        });

        it('should succeed with undefined for a non-existent field', () => {
            const result = getFirstString.convert(bad);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toBeUndefined();
            }
        });

        it('should fail if the parameter is not an object', () => {
            ['hello', 10, true, (): string => 'hello', undefined].forEach((v) => {
                const result = getFirstString.convert(v);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/non-object/i);
                }
            });
        });
    });

    describe('object converter', () => {
        interface Want {
            stringField: string;
            optionalStringField?: string;
            numField: number;
            boolField: boolean;
            numbers?: number[];
        };

        const converter = Converter.object<Want>({
            stringField: Converter.string,
            optionalStringField: Converter.string,
            numField: Converter.number,
            boolField: Converter.boolean,
            numbers: Converter.arrayOf(Converter.number),
        }, [
            'optionalStringField',
            'numbers',
        ]);

        it('should convert a valid object with missing optional fields', () => {
            const src = {
                stringField: 'string1',
                numField: -1,
                boolField: true,
            };

            const expected: Want = {
                stringField: 'string1',
                numField: -1,
                boolField: true,
            };

            const result = converter.convert(src);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(expected);
            }
        });

        it('should convert a valid object with optional fields present', () => {
            const src = {
                stringField: 'string1',
                optionalStringField: 'optional string',
                numField: -1,
                boolField: true,
                numbers: [-1, 0, 1, '2'],
            };

            const expected: Want = {
                stringField: 'string1',
                optionalStringField: 'optional string',
                numField: -1,
                boolField: true,
                numbers: [-1, 0, 1, 2],
            };

            const result = converter.convert(src);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(expected);
            }
        });

        it('should fail if any non-optional fields are missing', () => {
            const src = {
                misnamedStringField: 'string1',
                numField: -1,
                boolField: true,
            };
            const result = converter.convert(src);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/stringField not found/i);
            }
        });

        it('should fail if any non-optional fields are mistyped', () => {
            const src = {
                stringField: 'string1',
                numField: true,
                boolField: -1,
            };
            const result = converter.convert(src);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/not a number/i);
            }
        });

        it('should silently ignore fields without a converter', () => {
            const partialConverter = Converter.object<Want>({
                stringField: Converter.string,
                optionalStringField: Converter.optionalString,
                numField: Converter.number,
                boolField: Converter.boolean,
                numbers: undefined,
            });

            const src = {
                stringField: 'string1',
                optionalStringField: 'optional string',
                numField: -1,
                boolField: true,
                numbers: [-1, 0, 1, '2'],
            };

            const expected: Want = {
                stringField: 'string1',
                optionalStringField: 'optional string',
                numField: -1,
                boolField: true,
            };

            const result = partialConverter.convert(src);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(expected);
            }
        });
    });

    describe('transform converter', () => {
        interface Want {
            stringField: string;
            optionalStringField?: string;
            numField: number;
            boolField: boolean;
            numbers?: number[];
        };

        const converter = Converter.transform<Want>({
            stringField: Converter.field('string1', Converter.string),
            optionalStringField: Converter.field('string2', Converter.string).optional(),
            numField: Converter.field('num1', Converter.number),
            boolField: Converter.field('b1', Converter.boolean),
            numbers: Converter.field('nums', Converter.arrayOf(Converter.number)).optional(),
        });

        it('should convert a valid object with empty optional fields', () => {
            const src = {
                string1: 'string1',
                num1: -1,
                b1: true,
            };

            const expected: Want = {
                stringField: 'string1',
                numField: -1,
                boolField: true,
            };

            const result = converter.convert(src);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(expected);
            }
        });

        it('should convert a valid object with optional fields present', () => {
            const src = {
                string1: 'string1',
                string2: 'optional string',
                num1: -1,
                b1: true,
                nums: [-1, 0, 1, '2'],
            };

            const expected: Want = {
                stringField: 'string1',
                optionalStringField: 'optional string',
                numField: -1,
                boolField: true,
                numbers: [-1, 0, 1, 2],
            };

            const result = converter.convert(src);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(expected);
            }
        });

        it('should fail if any non-optional fields are missing', () => {
            const src = {
                misnamedString1: 'string1',
                num1: -1,
                b1: true,
            };
            const result = converter.convert(src);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/string1 not found/i);
            }
        });

        it('should fail if any non-optional fields are mistyped', () => {
            const src = {
                string1: 'string1',
                num1: true,
                b1: -1,
            };
            const result = converter.convert(src);
            expect(result.isFailure()).toBe(true);
            if (result.isFailure()) {
                expect(result.message).toMatch(/not a number/i);
            }
        });

        it('should ignore mistyped optional fields', () => {
            const src = {
                string1: 'string1',
                string2: true,
                num1: -1,
                b1: true,
            };

            const expected: Want = {
                stringField: 'string1',
                numField: -1,
                boolField: true,
            };

            const result = converter.convert(src);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(expected);
            }
        });

        it('should silently ignore fields without a converter', () => {
            const partialConverter = Converter.transform<Want>({
                stringField: Converter.field('string1', Converter.string),
                optionalStringField: Converter.field('string2', Converter.string).optional(),
                numField: Converter.field('num1', Converter.number),
                boolField: Converter.field('b1', Converter.boolean),
                numbers: undefined,
            });

            const src = {
                string1: 'string1',
                string2: 'optional string',
                num1: -1,
                b1: true,
                nums: [-1, 0, 1, '2'],
            };

            const expected: Want = {
                stringField: 'string1',
                optionalStringField: 'optional string',
                numField: -1,
                boolField: true,
            };

            const result = partialConverter.convert(src);
            expect(result.isSuccess()).toBe(true);
            if (result.isSuccess()) {
                expect(result.value).toEqual(expected);
            }
        });
    });
});
