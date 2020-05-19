

export type Result<T> = Success<T> | Failure<T>;

export interface IResult<T> { // eslint-disable-line @typescript-eslint/interface-name-prefix
    isSuccess(): this is Success<T>;
    isFailure(): this is Failure<T>;
    getValueOrThrow(): T;
    getValueOrDefault(dflt?: T): T|undefined;
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
