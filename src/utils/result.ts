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

export type Result<T> = Success<T> | Failure<T>;
export type SuccessContinuation<T> = (value: T) => Result<T> | undefined;
export type FailureContinuation<T> = (message: string) => Result<T> | undefined;
export type ResultContinuations<T> = { success?: SuccessContinuation<T>; failure?: FailureContinuation<T> };

export interface IResult<T> { // eslint-disable-line @typescript-eslint/interface-name-prefix
    isSuccess(): this is Success<T>;
    isFailure(): this is Failure<T>;
    getValueOrThrow(): T;
    getValueOrDefault(dflt?: T): T|undefined;
    onSuccess(cb: SuccessContinuation<T>): IResult<T>;
    onFailure(cb: FailureContinuation<T>): IResult<T>;
    on(cbs: ResultContinuations<T>): IResult<T>;
}

export class Success<T> implements IResult<T> {
    private readonly _value: T;

    constructor(value: T) {
        this._value = value;
    }

    public isSuccess(): this is Success<T> {
        return true;
    }

    public isFailure(): this is Failure<T> {
        return false;
    }

    public get value(): T {
        return this._value;
    }

    public getValueOrThrow(): T {
        return this._value;
    }

    public getValueOrDefault(dflt?: T): T|undefined {
        return this._value ?? dflt;
    }

    public onSuccess(cb: SuccessContinuation<T>): Result<T> {
        return cb(this.value) ?? this;
    }

    public onFailure(__: FailureContinuation<T>): Result<T> {
        return this;
    }

    public on(cbs: ResultContinuations<T>): Result<T> {
        if (cbs.success) {
            return cbs.success(this.value) ?? this;
        }
        return this;
    }
}

export class Failure<T> implements IResult<T> {
    private readonly _message: string;

    constructor(message: string) {
        this._message = message;
    }

    public isSuccess(): this is Success<T> {
        return false;
    }

    public isFailure(): this is Failure<T> {
        return true;
    }

    public get message(): string {
        return this._message;
    }

    public getValueOrThrow(): never {
        throw new Error(this._message);
    }

    public getValueOrDefault(dflt?: T): T|undefined {
        return dflt;
    }

    public onSuccess(__: SuccessContinuation<T>): Result<T> {
        return this;
    }

    public onFailure(cb: FailureContinuation<T>): Result<T> {
        return cb(this.message) ?? this;
    }

    public on(cbs: ResultContinuations<T>): Result<T> {
        if (cbs.failure) {
            return cbs.failure(this.message) ?? this;
        }
        return this;
    }
}

/**
 * Helper function for successful return
 * @param val The value to be returned
 */
export function succeed<T>(val: T): Success<T> {
    return new Success<T>(val);
}

/**
 * Helper function for error return
 * @param message Error message to be returned
 */
export function fail<T>(message: string): Failure<T> {
    return new Failure<T>(message);
}

/**
 * Wraps a function which returns a value of type <T> or throws
 * to produce Success<T> or Failure<T>
 * @param func The method to be captured
 */
export function captureResult<T>(func: () => T): Result<T> {
    try {
        return succeed(func());
    }
    catch (err) {
        return fail((err as Error).message);
    }
}

export function mapResults<T>(resultsIn: Iterable<Result<T>>): Result<T[]> {
    const errors: string[] = [];
    const elements: T[] = [];

    for (const result of resultsIn) {
        if (result.isSuccess()) {
            elements.push(result.value);
        }
        else {
            errors.push(result.message);
        }
    }

    if (errors.length > 0) {
        return fail(errors.join('\n'));
    }
    return succeed(elements);
}
