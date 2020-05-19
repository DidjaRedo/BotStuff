import { Failure, Success, captureResult } from '../../src/result';

describe('Result module', () => {
    describe('Success class', () => {
        describe('getValueOrThrow method', () => {
            it('should return the value and not throw', () => {
                const value = 'hello';
                const s = new Success(value);
                let gotValue: string|undefined;

                expect(() => {
                    gotValue = s.getValueOrThrow();
                }).not.toThrow();
                expect(gotValue).toEqual(value);
            });
        });

        describe('getValueOrDefault method', () => {
            it('should return the value and not throw', () => {
                const value = 'hello';
                const s = new Success(value);
                let gotValue: string|undefined;

                expect(() => {
                    gotValue = s.getValueOrDefault();
                }).not.toThrow();
                expect(gotValue).toEqual(value);
            });

            describe('with an undefined value', () => {
                it('should return the supplied default and not throw', () => {
                    const dflt = 'default value';
                    const s = new Success<string|undefined>(undefined);
                    let gotValue: string|undefined;
                    expect(() => {
                        gotValue = s.getValueOrDefault(dflt);
                    }).not.toThrow();
                    expect(gotValue).toEqual(dflt);
                });
            });
        });
    });

    describe('Failure class', () => {
        describe('getValueOrThrow method', () => {
            it('should throw the message', () => {
                const errorMessage = 'this is an error message';
                const f = new Failure(errorMessage);

                expect(() => f.getValueOrThrow()).toThrowError(errorMessage);
            });
        });

        describe('getValueOrDefault method', () => {
            it('should return undefined if default is omitted', () => {
                const f = new Failure<string>('this is an error message');
                let gotValue: string|undefined;

                expect(() => {
                    gotValue = f.getValueOrDefault();
                }).not.toThrow();
                expect(gotValue).toBeUndefined();
            });

            it('should return the supplied default and not throw', () => {
                const dflt = 'default value';
                const f = new Failure<string>('this is an error message');
                let gotValue: string|undefined;
                expect(() => {
                    gotValue = f.getValueOrDefault(dflt);
                }).not.toThrow();
                expect(gotValue).toEqual(dflt);
            });
        });

        describe('captureResult method', () => {
            it('should return success and the value if the method does not throw', () => {
                const successfulReturn = 'This is a successful return';
                const result = captureResult(() => {
                    return successfulReturn;
                });
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toBe(successfulReturn);
                }
            });

            it('should return failure and the thrown message if the method throws', () => {
                const failedReturn = 'This is a successful return';
                const result = captureResult(() => {
                    throw new Error(failedReturn);
                });
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toBe(failedReturn);
                }
            });
        });
    });
});
