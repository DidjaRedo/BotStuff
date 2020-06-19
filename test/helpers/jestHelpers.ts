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

import { Result } from '../../src/utils/result';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toFail();
            toFailWith(message: string|RegExp);
            toSucceed();
            toSucceedWithCallback<T>(cb: (value: T) => void);
            toSucceedWith<T>(value: unknown);
            toBeInRange(min: number, max: number);
            toBeOneOf(values: unknown[]);
        }
    }
}

expect.extend({
    toFail<T>(received: Result<T>) {
        if (received.isFailure()) {
            return {
                message: () => 'expected not to fail',
                pass: true,
            };
        }
        else {
            return {
                message: () => 'expected to fail',
                pass: false,
            };
        }
    },
    toFailWith<T>(received: Result<T>, message: string|RegExp|undefined) {
        if (!received.isFailure()) {
            return {
                message: () => 'expected to fail',
                pass: false,
            };
        }
        if (this.isNot) {
            if (message === undefined) {
                expect(received.message).not.toBeUndefined();
            }
            else {
                expect(received.message).not.toEqual(expect.stringMatching(message));
            }
        }
        else if (message === undefined) {
            expect(received.message).toBeUndefined();
        }
        else {
            expect(received.message).toEqual(expect.stringMatching(message));
        }
        return {
            message: () => 'expected to fail',
            pass: !this.isNot,
        };
    },
    toSucceed<T>(received: Result<T>) {
        const options = {
            comment: 'Result.is success',
            isNot: this.isNot,
            promise: this.promise,
        };

        const header = `${this.utils.matcherHint('toSucceed', undefined, undefined, options)}\n\n`;
        if (received.isSuccess()) {
            return {
                message: () =>
                    `${header}Expected: not to succeed\nReceived: success with ${this.utils.stringify(received.value)}`,
                pass: true,
            };
        }
        else {
            return {
                message: () =>
                    `${header}Expected: success\nReceived: failure with ${this.utils.stringify(received.message)}`,
                pass: false,
            };
        }
    },
    toSucceedWith<T>(received: Result<T>, match: unknown) {
        const options = {
            // comment: 'Result.is success with',
            isNot: this.isNot,
            promise: this.promise,
        };

        const header = `${this.utils.matcherHint('toSucceedWith', undefined, undefined, options)}\n\n`;
        const expected = `Expected: ${this.isNot ? ' not ' : ''} success with ${this.utils.stringify(match)}`;
        if (received.isSuccess()) {
            if (this.isNot) {
                expect(received.value).not.toEqual(match);
            }
            else {
                expect(received.value).toEqual(match);
            }
            return {
                message: () =>
                    `${header}${expected}\nReceived: success with ${this.utils.stringify(received.value)}`,
                pass: !this.isNot,
            };
        }
        else {
            return {
                message: () =>
                    `${header}${expected}\nReceived: failure with '${received.message}'`,
                pass: false,
            };
        }
    },
    toSucceedWithCallback<T>(received: Result<T>, cb: (value: T) => void) {
        const options = {
            // comment: 'Result.is success with callback',
            isNot: this.isNot,
            promise: this.promise,
        };
        const header = `${this.utils.matcherHint('toSucceedWith', undefined, undefined, options)}\n\n`;
        const expected = `Expected: ${this.isNot ? ' not ' : ''} to succeed with a callback`;
        if (received.isSuccess()) {
            cb(received.value);
            return {
                message: () =>
                    `${header}${expected}\nReceived: success with ${this.utils.stringify(received.value)}`,
                pass: !this.isNot,
            };
        }
        else {
            return {
                message: () => `${header}${expected}\nReceived: failure with '${received.message}'`,
                pass: false,
            };
        }
    },
    toBeInRange(received: number, min: number, max: number) {
        const pass = (received >= min) && (received <= max);
        if (pass) {
            return {
                message: () => `expected not to be in range ${min} .. ${max}`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected to be in range ${min} .. ${max}`,
                pass: false,
            };
        }
    },
    toBeOneOf(received: unknown, expected: unknown[]) {
        let pass = false;
        for (const candidate of expected) {
            pass = pass || this.equals(received, candidate);
        }

        if (pass) {
            return {
                message: () => `expected ${JSON.stringify(received)} not to be one of ${JSON.stringify(expected)}`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${JSON.stringify(received)} to be one of ${JSON.stringify(expected)}`,
                pass: false,
            };
        }
    },
});

