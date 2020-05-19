
import { Result, fail, succeed } from './result';

type OnError = 'failOnError' | 'ignoreErrors';

/**
 * Simple templated converter wrapper to simplify typed conversion from unknown.
 */
export class Converter<T> {
    private _converter: (from: unknown) => Result<T>;

    public constructor(converter: (from: unknown) => Result<T>) {
        this._converter = converter;
    }

    /**
     * Converts from unknown to <T>
     * @param from The unknown to be converted
     * @returns An @see Result with a value or an error message
     */
    public convert(from: unknown): Result<T> {
        return this._converter(from);
    }

    /**
     * Converts from unknown to <T> or undefined, as appropriate.
     * If 'onError' is 'failOnError', the converter succeeds for
     * 'undefined' or any convertible value, but reports an error
     * if it encounters a value that cannot be converted.  If 'onError'
     * is 'ignoreErrors' (default) then values that cannot be converted
     * result in a successful return of 'undefined'.
     * @param from The unknown to be converted
     * @param onError Specifies handling of values that cannot be converted
     */
    public convertOptional(from: unknown, onError: OnError = 'ignoreErrors'): Result<T|undefined> {
        const result = this._converter(from);
        if (result.isFailure()) {
            return ((from === undefined) || onError === 'ignoreErrors') ? succeed(undefined) : result;
        }
        return result;
    }

    /**
     * Creates a converter for an optional value. If 'onError'
     * is 'failOnError', the converter accepts 'undefined' or a
     * convertible value, but reports an error if it encounters
     * a value that cannot be converted.  If 'onError' is 'ignoreErrors'
     * (default) then values that cannot be converted result in a
     * successful return of 'undefined'.
     *
     * @param onError Specifies handling of values that cannot be converted
     * */
    public optional(onError: OnError = 'ignoreErrors'): Converter<T|undefined> {
        return new Converter((from: unknown) => {
            return this.convertOptional(from, onError);
        });
    }

    /**
     * Applies a (possibly) mapping conversion to the converted value.
     * @param mapper A function which maps from the converted type to some other type.
     */
    public map<T2>(mapper: (from: T) => Result<T2>): Converter<T2> {
        return new Converter((from: unknown) => {
            const innerResult = this._converter(from);
            if (innerResult.isSuccess()) {
                return mapper(innerResult.value);
            }
            return fail(innerResult.message);
        });
    }

    /**
     * Creates a converter with an optional constraint.  If the base converter
     * succeeds, calls a supplied constraint evaluation function with the
     * value and fails the conversion if the function returns either false
     * or Failure<T>.
     *
     * @param constraint Constraint evaluation function
     */
    public withConstraint(constraint: (val: T) => boolean|Result<T>): Converter<T> {
        return new Converter((from: unknown) => {
            const result = this._converter(from);
            if (result.isSuccess()) {
                const constraintResult = constraint(result.value);
                if (typeof constraintResult === 'boolean') {
                    return constraintResult ? result : fail(`Value ${JSON.stringify(result.value)} does not meet constraint.`);
                }
                return constraintResult;
            }
            return result;
        });
    }
}

/**
 * A converter to convert unknown to string. Values of type
 * string succeed.  Anything else fails.
 */
export const string = new Converter<string>((from: unknown) => {
    return typeof from === 'string'
        ? succeed(from as string)
        : fail(`Not a string: ${JSON.stringify(from)}`);
});

/**
 * A converter to convert unknown to a number.  Numbers and strings
 * with a numeric format succeed.  Anything else fails.
 */
export const number = new Converter<number>((from: unknown) => {
    if (typeof from !== 'number') {
        const num: number = (typeof from === 'string' ? Number(from) : NaN);
        return isNaN(num)
            ? fail(`Not a number: ${JSON.stringify(from)}`)
            : succeed(num);
    }
    return succeed(from);
});

/**
 * A converter to convert unknown to boolean. Boolean values or the
 * case-insensitive strings 'true' and 'false' succeed.  Anything
 * else fails.
 */
export const boolean = new Converter<boolean>((from: unknown) => {
    if (typeof from === 'boolean') {
        return succeed(from as boolean);
    }
    else if (typeof from === 'string') {
        switch (from.toLowerCase()) {
            case 'true': return succeed(true);
            case 'false': return succeed(false);
        }
    }
    return fail(`Not a boolean: ${JSON.stringify(from)}`);
});

/**
 * A converter to convert an optional string value. Values of type string
 * are returned.  Anything else returns success with an undefined value.
 */
export const optionalString = string.optional();

/**
 * A converter to convert an optional number value. Values of type number
 * or numeric strings are converted and returned. Anything else returns
 * success with an undefined value.
 */
export const optionalNumber = number.optional();

/**
 * A converter to convert an optional boolean value. Values of type boolean
 * or strings that match (case-insensitive) 'true' or 'false' are converted
 * and returned.  Anything else returns success with an undefined value.
 */
export const optionalBoolean = boolean.optional();

/**
 * A helper wrapper for polymorphic fields. Invokes the wrapped converters
 * in sequence, returning the first successful result.  Returns an error
 * if none of the supplied converters can convert the value.
 *
 * If onError is 'ignoreErrors' (default), then errors from any of the
 * converters are ignored provided that some converter succeeds.  If
 * onError is 'failOnError', then an error from any converter fails the entire
 * conversion.
 *
 * @param converters An ordered list of converters to be considered
 * @param onError Specifies treatment of unconvertable elements
 */
export function oneOf<T>(converters: Array<Converter<T>>, onError: OnError = 'ignoreErrors'): Converter<T> {
    return new Converter((from: unknown) => {
        const errors: string[] = [];
        for (const converter of converters) {
            const result = converter.convert(from);
            if (result.isSuccess() && (result.value !== undefined)) {
                return result;
            }

            if (result.isFailure()) {
                if (onError === 'failOnError') {
                    return result;
                }
                errors.push(result.message);
            }
        }
        return fail(`No matching decoder for ${JSON.stringify(from)}: ${errors.join('\n')}`);
    });
}

/**
 * A helper wrapper for converting an array of <T>.  If onError is 'failOnError' (default),
 * then the entire conversion fails if any element cannot be converted.  If onError
 * is 'ignoreErrors', failing elements are silently ignored.
 * @param converter Converter used to convert each item in the array
 * @param ignoreErrors Specifies treatment of unconvertable elements
 */
export function arrayOf<T>(converter: Converter<T>, onError: OnError = 'failOnError'): Converter<T[]> {
    return new Converter((from: unknown) => {
        if (!Array.isArray(from)) {
            return fail(`Not an array: ${JSON.stringify(from)}`);
        }

        const successes: T[] = [];
        const errors: string[] = [];
        from.forEach((item) => {
            const result = converter.convert(item);
            if (result.isSuccess() && result.value !== undefined) {
                successes.push(result.value);
            }
            else if (result.isFailure()) {
                errors.push(result.message);
            }
        });

        return (errors.length === 0) || (onError === 'ignoreErrors')
            ? succeed(successes)
            : fail(errors.join('\n'));
    });
}

/**
 * A helper wrapper to convert the string-keyed properties of an object to a Record of T.
 * If onError is 'fail' (default),  then the entire conversion fails if any element
 * cannot be converted.  If onError is 'ignore' failing elements are silently ignored.
 * @param converter Converter used to convert each item in the record
 * @param ignoreErrors Specifies treatment of unconvertable elements
 */
export function recordOf<T>(converter: Converter<T>, onError: 'fail'|'ignore' = 'fail'): Converter<Record<string, T>> {
    return new Converter((from: unknown) => {
        if ((typeof from !== 'object') || Array.isArray(from)) {
            return fail(`Not a string-keyed object: ${JSON.stringify(from)}`);
        }

        const record: Record<string, T> = {};
        const errors: string[] = [];

        for (const key in from) {
            if (from.hasOwnProperty(key)) {
                const result = converter.convert(from[key]);
                if (result.isSuccess()) {
                    record[key] = result.value;
                }
                else {
                    errors.push(result.message);
                }
            }
        }

        return (errors.length === 0) || (onError === 'ignore')
            ? succeed(record)
            : fail(errors.join('\n'));
    });
}

/**
 * A helper function to extract and convert a field from an object. Succeeds and returns
 * the converted value if the field exists in the supplied parameter and can be converted.
 * Fails otherwise.
 * @param name The name of the field to be extracted.
 * @param converter Converter used to convert the extracted field.
 */
export function field<T>(name: string, converter: Converter<T>): Converter<T> {
    return new Converter((from: unknown) => {
        if (typeof from === 'object' && from !== null) {
            if (name in from) {
                return converter.convert(from[name]);
            }
            return fail(`Field ${name} not found in: ${JSON.stringify(from)}`);
        }
        return fail(`Cannot convert field from non-object ${JSON.stringify(from)}`);
    });
}

/**
 * A helper function to extract and convert an optional field from an object. Succeeds
 * and returns the converted value if the field exists in the supplied parameter and can
 * be converted. Succeeds with undefined if the parameter is an object but the named field
 * is not present. Fails if the supplied parameter is not an object.
 * @param name The name of the field to be extracted.
 * @param converter Converter used to convert the extracted field.
 */
export function optionalField<T>(name: string, converter: Converter<T>): Converter<T|undefined> {
    return new Converter((from: unknown) => {
        if (typeof from === 'object' && from !== null) {
            if (name in from) {
                return converter.convert(from[name]);
            }
            return succeed(undefined);
        }
        return fail(`Cannot convert field from non-object ${JSON.stringify(from)}`);
    });
}

export type FieldConverters<T> = { [ key in keyof T ]: Converter<T[key]> };

/**
 * Helper to convert an object without changing shape. The source parameter is an object with
 * key names that correspond to the target object and the appropriate corresponding converter
 * as the property value. If all of the requested fields exist and can be converted, returns a
 * new object with the converted values under the original key names.  If any fields do not exist
 * or cannot be converted, the entire conversion fails.
 *
 * Fields that succeed but convert to undefined are omitted from the result object but do not
 * fail the conversion.
 * @param fields An object containing defining the shape and converters to be applied.
 */
export function object<T>(fields: FieldConverters<T>, optional?: (keyof T)[]): Converter<T> {
    return new Converter((from: unknown) => {
        const converted = {} as { [key in keyof T]: T[key] };
        const errors: string[] = [];

        for (const key in fields) {
            if (fields[key]) {
                const isOptional = (optional && optional.includes(key));
                const result = isOptional
                    ? optionalField(key, fields[key]).convert(from)
                    : field(key, fields[key]).convert(from);

                if (result.isSuccess() && (result.value !== undefined)) {
                    converted[key] = result.value;
                }
                else if (result.isFailure()) {
                    errors.push(result.message);
                }
            }
        }

        return (errors.length === 0) ? succeed(converted) : fail(errors.join('\n'));
    });
}

/**
 * Helper to convert an object to a new object with a different shape. The source parameter is
 * an object with key names that correspond to the target object, and an approriate _field_
 * converter that will extract and convert a single field from the source object.
 *
 * If all of the extracted fields exist and can be converted, returns a new object with the
 * converted values under the original key names.  If any fields to be extracted do not exist
 * or cannot be converted, the entire conversion fails.
 *
 * Fields that succeed but convert to undefined are omitted from the result object but do not
 * fail the conversion.
 *
 * @param fields An object defining the shape of the target object and the field converters
 * to be used to construct it.
 */
export function transform<T>(fields: { [key in keyof T]: Converter<T[key]> }): Converter<T> {
    return new Converter((from: unknown) => {
        const converted = {} as { [ key in keyof T]: T[key] };
        const errors: string[] = [];

        for (const key in fields) {
            if (fields[key]) {
                const result = fields[key].convert(from);
                if (result.isSuccess() && (result.value !== undefined)) {
                    converted[key] = result.value;
                }
                else if (result.isFailure()) {
                    errors.push(result.message);
                }
            }
        }

        return (errors.length === 0) ? succeed(converted) : fail(errors.join('\n'));
    });
}
