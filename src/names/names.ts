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

import { Result, fail, mapResults, succeed } from '../utils/result';

export interface NamedThing {
    readonly name: string;
}

export interface Normalizable<TN extends NamedThing> {
    readonly name: string;
    readonly normalized: TN;
}

export class Names {
    /* istanbul ignore next */
    private constructor() {} // eslint-disable-line


    public static isValidName(input: string): boolean {
        return (input && (typeof input === 'string') && (input.trim().length > 0)) ? true : false;
    }

    public static validate(input: string, description: string): Result<boolean>;
    public static validate(input: Iterable<string>, description: string, minSize?: number): Result<boolean>;
    public static validate(input: string|Iterable<string>, description: string, minSize?: number): Result<boolean> {
        if (typeof input === 'string') {
            return this._validateName(input, description);
        }
        else if (!input) {
            return fail(`${description} must be non-empty string.`);
        }
        return this._validateNames(input, description, minSize);
    }

    public static throwOnInvalidName(input: string, description: string): void;
    public static throwOnInvalidName(input: Iterable<string>, description: string, minSize?: number): void;
    public static throwOnInvalidName(input: string|Iterable<string>, description: string, minSize?: number): void {
        this.validate(input, description, minSize).getValueOrThrow();
    }

    public static normalize(input: string): Result<string>
    public static normalize(input: string[]): Result<string[]>;
    public static normalize(input: string|string[]): Result<string|string[]> {
        if (typeof input === 'string') {
            return Names._normalizeName(input);
        }
        else if (input === undefined) {
            return fail('Cannot normalize undefined.');
        }
        return Names._normalizeNames(input);
    }

    public static normalizeOrThrow(input: string): string;
    public static normalizeOrThrow(input: string[]): string[];
    public static normalizeOrThrow(input: string|string[]): string|string[] {
        if (typeof input === 'string') {
            return Names.normalize(input).getValueOrThrow();
        }
        return Names.normalize(input).getValueOrThrow();
    }

    public static tryNormalizeName(input: string): string|undefined {
        if ((!input) || (input.trim().length < 1)) {
            return undefined;
        }
        return Names.normalize(input).getValueOrDefault();
    }

    public static tryNormalizeNames(input: string[]): string[]|undefined {
        const normalized = [];
        if (input && (input.length > 0)) {
            input.forEach((name): void => {
                name = Names.tryNormalizeName(name);
                if (name) {
                    normalized.push(name);
                }
            });
        }
        return ((normalized.length > 0) ? normalized : undefined);
    }

    public static tryNormalize(input: string): string|undefined;
    public static tryNormalize(input: string[]): string[]|undefined;
    public static tryNormalize(input: string|string[]): string|string[]|undefined {
        if (Array.isArray(input)) {
            return Names.tryNormalizeNames(input);
        }
        return Names.tryNormalizeName(input);
    }

    public static isListed(choices: string[]|undefined, lookingFor: string[]|string): boolean {
        if ((!choices) || (choices.length < 1)) {
            return false;
        }

        lookingFor = Array.isArray(lookingFor) ? lookingFor : [lookingFor];
        for (const want of lookingFor) {
            if (choices.includes(Names.normalizeOrThrow(want))) {
                return true;
            }
        }

        return false;
    }

    public static isDefault(choices?: string[]): boolean {
        return (!choices) || (choices.length < 1);
    }

    public static isListedOrDefault(choices: string[]|undefined, lookingFor: string[]|string): boolean {
        return this.isDefault(choices) || this.isListed(choices, lookingFor);
    }

    private static _validateName(input: string, description: string): Result<boolean> {
        if (!Names.isValidName(input)) {
            return fail(`Invalid ${description} "${JSON.stringify(input)}" must be non-empty string.`);
        }
        return succeed(true);
    }

    private static _validateNames(input: Iterable<string>, description: string, minSize?: number): Result<boolean> {
        const results = [];
        for (const str of input) {
            results.push(Names._validateName(str, description));
        }

        if (results.length < minSize) {
            results.push(fail(`Need at least ${minSize} ${description}`));
        }

        const result = mapResults(results);
        return result.isSuccess() ? succeed(true) : fail(result.message);
    }

    private static _normalizeName(input: string): Result<string> {
        /* istanbul ignore next */
        if (typeof input !== 'string') {
            return fail(`Cannot normalize an input of type ${typeof input}.`);
        }

        const trimmed = input.trim();
        if (trimmed.length < 1) {
            return fail('Cannot normalize an empty string.');
        }
        return succeed(trimmed.toLowerCase().replace(/[\W]/g, ''));
    }

    private static _normalizeNames(input: string[]): Result<string[]> {
        if (!Array.isArray(input)) {
            return fail(`Cannot normalize an input of type ${typeof input}`);
        }
        return mapResults(input.map((n) => Names._normalizeName(n)));
    }
}

