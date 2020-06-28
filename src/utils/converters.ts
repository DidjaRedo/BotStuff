
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
import { Range, RangeProperties } from './range';
import { Result, fail, succeed } from './result';
import { Converter } from './converter';

type OnError = 'failOnError' | 'ignoreErrors';

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
 *
 * @param values A converter to convert unknown to one of a set of
 * supplied enumerated values.  Anything else fails.
 */
export function enumeratedValue<T>(values: T[]): Converter<T> {
    return new Converter<T>((from: unknown): Result<T> => {
        const index = values.indexOf(from as T);
        return (index >= 0 ? succeed(values[index]) : fail(`Invalid enumerated value ${JSON.stringify(from)}`));
    });
}

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
 * Creates a converter which converts any string into an array of strings
 * by separating at a supplied delimiter.
 * @param delimiter The delimiter at which to split.
 */
export function delimitedString(delimiter: string, options: 'filtered'|'all' = 'filtered'): Converter<string[]> {
    return new Converter<string[]>((from: unknown) => {
        const result = string.convert(from);
        if (result.isSuccess()) {
            let strings = result.value.split(delimiter);
            if (options !== 'all') {
                strings = strings.filter((s) => (s.trim().length > 0));
            }
            return succeed(strings);
        }
        return fail(result.message);
    });
}

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
        return fail(`No matching converter for ${JSON.stringify(from)}: ${errors.join('\n')}`);
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
        for (const item of from) {
            const result = converter.convert(item);
            if (result.isSuccess() && result.value !== undefined) {
                successes.push(result.value);
            }
            else if (result.isFailure()) {
                errors.push(result.message);
            }
        }

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
                return converter.convert(from[name]).onFailure((message) => {
                    return fail(`Field ${name}: ${message}`);
                });
            }
            return fail(`Field ${name} not found in: ${JSON.stringify(from)}`);
        }
        return fail(`Cannot convert field "${name}" from non-object ${JSON.stringify(from)}`);
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
                const result = converter.convert(from[name]).onFailure((message) => {
                    return fail(`Field ${name}: ${message}`);
                });

                // if conversion was successful or input was undefined we
                // succeed with 'undefined', but we propagate actual
                // failures.
                if (result.isSuccess() || (from[name] !== undefined)) {
                    return result;
                }
            }
            return succeed(undefined);
        }
        return fail(`Cannot convert field "${name}" from non-object ${JSON.stringify(from)}`);
    });
}

export type FieldConverters<T> = { [ key in keyof T ]: Converter<T[key]> };

export class ObjectConverter<T> extends Converter<T> {
    public readonly fields: FieldConverters<T>;
    public readonly optionalFields: (keyof T)[];

    public constructor(fields: FieldConverters<T>, optional?: (keyof T)[]) {
        super((from: unknown) => {
            const converted = {} as { [key in keyof T]: T[key] };
            const errors: string[] = [];
            for (const key in fields) {
                if (fields[key]) {
                    const isOptional = optional?.includes(key) ?? false;
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

        this.fields = fields;
        this.optionalFields = optional ?? [];
    }

    public partial(optional?: (keyof T)[]): ObjectConverter<Partial<T>> {
        return new ObjectConverter(this.fields, optional);
    }

    public addPartial(addOptionalFields: (keyof T)[]): ObjectConverter<Partial<T>> {
        return this.partial([...this.optionalFields, ...addOptionalFields]);
    }
}

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
export function object<T>(fields: FieldConverters<T>, optional?: (keyof T)[]): ObjectConverter<T> {
    return new ObjectConverter(fields, optional);
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
export function transform<T>(fields: FieldConverters<T>): Converter<T> {
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

/**
 * A helper wrapper to convert a range of some other comparable type
 * @param converter Converter used to convert min and max extent of the raid
 * @param constructor Optional static constructor to instantiate the object
 */
export function rangeTypeOf<T, RT extends Range<T>>(converter: Converter<T>, constructor: (init: RangeProperties<T>) => Result<RT>): Converter<RT> {
    return new Converter((from: unknown) => {
        const result = object({
            min: converter,
            max: converter,
        }, ['min', 'max']).convert(from);
        if (result.isSuccess()) {
            return constructor({ min: result.value.min, max: result.value.max });
        }
        return fail(result.message);
    });
}

export function rangeOf<T>(converter: Converter<T>): Converter<Range<T>> {
    return rangeTypeOf<T, Range<T>>(converter, Range.createRange);
}
