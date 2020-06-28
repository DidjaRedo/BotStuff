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
import { Result, fail, succeed } from '../utils/result';
import { Names } from './names';

export type ElementInitializer<T> = (name: string, normalizedName: string) => Result<T>;
export type ElementUpdater<T> = (existing: T, update: T, name: string) => Result<T>;

export interface LookupResults<T> {
    found: T[];
    unknown: string[];
}

export class NormalizedMap<T> extends Map<string, T> {
    private _updater?: ElementUpdater<T>;

    public constructor(updater?: ElementUpdater<T>) {
        super();
        this._updater = updater;
    }

    public getStrict(name: string): Result<T> {
        const existing = this.tryGet(name);
        if (existing === undefined) {
            return fail(`Element ${name} does not exist.`);
        }
        return succeed(existing);
    }

    public tryGet(name: string): T|undefined {
        return super.get(Names.normalizeOrThrow(name));
    }

    public get(name: string): T|undefined {
        return this.tryGet(name);
    }

    public getOrAdd(name: string, create: ElementInitializer<T>): Result<T> {
        const normalized = Names.normalizeOrThrow(name);
        const existing = super.get(normalized);
        if (!existing) {
            return create(name, normalized).onSuccess((item: T) => {
                return this.trySet(normalized, item);
            });
        }
        return succeed(existing);
    }

    public set(name: string, value: T): this {
        this.trySet(name, value).getValueOrThrow();
        return this;
    }

    public setStrict(name: string, value: T): Result<T> {
        if (this.tryGet(name)) {
            return fail(`Element ${name} already exists.`);
        }
        this.set(name, value);
        return succeed(value);
    }

    public trySet(name: string, value: T): Result<T> {
        const result = Names.normalize(name);
        if (result.isFailure()) {
            return fail(result.message);
        }

        const normalized = result.value;
        if (this._updater) {
            const existing = super.get(normalized);
            if (existing) {
                const updateResult = this._updater(existing, value, normalized);
                if (updateResult.isFailure()) {
                    return fail(updateResult.message);
                }
                value = updateResult.value;
            }
        }
        super.set(normalized, value);
        return succeed(value);
    }

    public has(name: string): boolean {
        return super.has(Names.normalizeOrThrow(name));
    }

    public delete(name: string): boolean {
        return super.delete(Names.normalizeOrThrow(name));
    }

    public lookupElements(names: string[]): LookupResults<T> {
        const result: LookupResults<T> = {
            found: [],
            unknown: [],
        };

        for (const name of names) {
            const elem = this.tryGet(name);
            if (elem !== undefined) {
                if (!result.found.includes(elem)) {
                    result.found.push(elem);
                }
            }
            else {
                const normalized = Names.normalizeOrThrow(name);
                if (!result.unknown.includes(normalized)) {
                    result.unknown.push(normalized);
                }
            }
        }

        return result;
    }

    public getElements(names: string[]): T[] {
        const result = this.lookupElements(names);
        if (result.unknown.length > 0) {
            throw new Error(`Unknown names "${result.unknown.join(', ')}".`);
        }
        return result.found;
    }

    public tryGetElements(names: string[]): T[] {
        return this.lookupElements(names).found;
    }
}

