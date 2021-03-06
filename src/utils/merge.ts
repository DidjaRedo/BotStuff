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
import { Result, fail, succeed } from '@fgv/ts-utils';
import { Names } from '../names/names';

export interface ItemMergeOptions {
    onItemCollision: 'keepExisting'|'replace'|'error';
}

export interface ArrayMergeOptions {
    onArrayCollision: 'keepExisting'|'replace'|'merge'|'error';
}

export interface FieldMergeOptions {
    onUnknownField: 'error'|'ignore';
}

export interface MergeOptions extends ItemMergeOptions, ArrayMergeOptions, FieldMergeOptions {

}

export const defaultItemMergeOptions: ItemMergeOptions = {
    onItemCollision: 'replace',
};

export const defaultArrayMergeOptions: ArrayMergeOptions = {
    onArrayCollision: 'replace',
};

export const defaultFieldMergeOptions: FieldMergeOptions = {
    onUnknownField: 'error',
};

export const defaultMergeOptions: MergeOptions = {
    ...defaultItemMergeOptions,
    ...defaultArrayMergeOptions,
    ...defaultFieldMergeOptions,
};

export type MergeFunction<TB, TM, TO> = (base?: TB, merge?: TM, options?: Partial<TO>) => Result<TB|undefined>;

export class Merger<TB, TM, TO> {
    private _mergeFunction: MergeFunction<TB, TM, TO>;

    public constructor(mergeFunction: MergeFunction<TB, TM, TO>) {
        this._mergeFunction = mergeFunction;
    }

    public merge(base?: TB, merge?: TM, options?: Partial<TO>): Result<TB|undefined> {
        return this._mergeFunction(base, merge, options);
    }
}

export class ItemMerger<T> extends Merger<T, T, ItemMergeOptions> {
    public constructor(mergeFunction: MergeFunction<T, T, ItemMergeOptions>) {
        super(mergeFunction);
    }
}

export function mergeItem<T>(base?: T, merge?: T, options?: Partial<ItemMergeOptions>): Result<T|undefined> {
    options = options ?? defaultItemMergeOptions;
    if (merge !== undefined) {
        if (base !== undefined) {
            if (options.onItemCollision === 'error') {
                return fail(`Unable to replace existing value "${base}" with "${merge}".`);
            }
            return succeed(options.onItemCollision === 'keepExisting' ? base : merge);
        }
        return succeed(merge);
    }
    return succeed(base);
}

export function mergeArray<T>(base?: T[]|undefined, merge?: T[], options?: Partial<ArrayMergeOptions>): Result<T[]> {
    options = options ?? defaultArrayMergeOptions;
    if ((merge !== undefined) && (merge.length > 0)) {
        if ((base !== undefined) && (base.length > 0)) {
            if (options.onArrayCollision === 'error') {
                return fail(`Unable to replace existing value "${base}" with "${merge}".`);
            }
            else if (options.onArrayCollision === 'merge') {
                const result = [...base];
                for (const nv of merge) {
                    if (!result.includes(nv)) {
                        result.push(nv);
                    }
                }
                return succeed(result);
            }
            return succeed(options.onArrayCollision === 'keepExisting' ? base : merge);
        }
        return succeed(merge);
    }
    // istanbul ignore next
    return succeed(base ?? []);
}

export function array<T>(): Merger<T[], T[], ArrayMergeOptions> {
    return new Merger((base?: T[], toMerge?: T[]|undefined, options?: Partial<ArrayMergeOptions>): Result<T[]> => {
        return mergeArray(base, toMerge, options);
    });
}

export function item<T>(): Merger<T, T, ItemMergeOptions> {
    return new Merger(mergeItem);
}

export const string = new ItemMerger<string>(mergeItem);
export const number = new ItemMerger<number>(mergeItem);
export const boolean = new ItemMerger<boolean>(mergeItem);

export const optionalString = new ItemMerger<string|undefined>(mergeItem);
export const optionalNumber = new ItemMerger<number|undefined>(mergeItem);
export const optionalBoolean = new ItemMerger<boolean|undefined>(mergeItem);

export const normalizedString = new ItemMerger<string>((base?: string, toMerge?: string, options?: Partial<MergeOptions>): Result<string|undefined> => {
    if (toMerge !== undefined) {
        const result = Names.normalize(toMerge);
        if (result.isFailure()) {
            return fail(result.message);
        }
        toMerge = result.value;
    }
    return mergeItem(base, toMerge, options);
});

export const stringArray = array<string>();
export const normalizedStringArray = new Merger((base?: string[], toMerge?: string[], options?: Partial<MergeOptions>): Result<string[]> => {
    if ((toMerge !== undefined) && (toMerge.length > 0)) {
        const result = Names.normalize(toMerge);
        if (result.isFailure()) {
            return fail(result.message);
        }
        toMerge = result.value;
    }
    return mergeArray(base, toMerge, options);
});

export interface FieldMergers<FT, OT extends MergeOptions> {
    options?: Partial<OT>;
    mergers: Partial<{ [key in keyof FT]: Merger<FT[key], FT[key], OT> }>;
}

export function getMergedFields<FT, OT extends MergeOptions>(
    base: FT|undefined,
    toMerge: Partial<FT>|undefined,
    mergers: FieldMergers<FT, OT>,
    options?: Partial<OT>
): Result<Partial<FT>> {
    const merged: Partial<FT> = {};
    const errors: string[] = [];

    // can only happen if a clone method returns undefined which is
    // unlikely to happen and a pain to test
    // istanbul ignore next
    if (base === undefined) {
        return fail('Cannot merge into undefined base object');
    }

    options = options ?? mergers.options;

    for (const key in toMerge) {
        if (toMerge[key] !== undefined) {
            const merger = mergers.mergers[key];
            if (merger !== undefined) {
                const result = merger.merge(base[key], toMerge[key], options);
                if (result.isSuccess()) {
                    merged[key] = result.value;
                }
                else {
                    errors.push(result.message);
                }
            }
            // istanbul ignore next
            else if (options?.onUnknownField === 'error') {
                errors.push(`No merge method for key ${key}`);
            }
        }
    }

    if (errors.length > 0) {
        return fail(`Unable to merge options\n${errors.join('\n')}\n`);
    }
    return succeed(merged);
}

export function objectInPlace<T, OT extends MergeOptions>(fields: FieldMergers<T, OT>): Merger<T, Partial<T>, OT> {
    return new Merger((base?: T, toMerge?: Partial<T>, options?: Partial<OT>): Result<T> => {
        if (base === undefined) {
            return fail('Cannot merge into an undefined base object.');
        }

        // istanbul ignore next
        const result = getMergedFields(base, toMerge ?? {}, fields, options);
        if (result.isFailure()) {
            return fail(result.message);
        }

        const merged = result.value;
        for (const key in merged) {
            /* istanbul ignore else */
            if (merged[key] !== undefined) {
                // typescript infers T[Extract<keyof T, string>]|undefined
                // despite the test for undefined.
                base[key] = merged[key] as T[Extract<keyof T, string>];
            }
        }

        return succeed(base);
    });
}

export function objectNew<T, OT extends MergeOptions>(
    fields: FieldMergers<T, OT>,
    clone: (base?: T) => T,
): Merger<T, Partial<T>, OT> {
    return new Merger((base?: T, toMerge?: Partial<T>, options?: Partial<OT>): Result<T> => {
        const rtrn: T = clone(base);

        // istanbul ignore next
        const result = getMergedFields(rtrn, toMerge ?? {}, fields, options);
        if (result.isFailure()) {
            return fail(result.message);
        }

        const merged = result.value;
        for (const key in merged) {
            /* istanbul ignore else */
            if (merged[key] !== undefined) {
                // typescript infers T[Extract<keyof T, string>]|undefined
                // despite the test for undefined.
                rtrn[key] = merged[key] as T[Extract<keyof T, string>];
            }
        }

        return succeed(rtrn);
    });
}

export class ObjectMerger<T, OT extends MergeOptions> {
    private _fields: FieldMergers<T, OT>;
    private _options?: OT;
    private _inPlaceMerger: Merger<T, Partial<T>, OT>;
    private _copyMerger: Merger<T, Partial<T>, OT>;

    public constructor(fields: FieldMergers<T, OT>, clone: (base?: T) => T, options?: OT) {
        this._fields = fields;
        this._options = options;
        this._inPlaceMerger = objectInPlace(fields);
        this._copyMerger = objectNew(fields, clone);
    }

    public mergeInPlace(base: T, merge?: Partial<T>, options?: OT): Result<T|undefined> {
        return this._inPlaceMerger.merge(base, merge, options ?? this._options);
    }

    public mergeIntoCopy(base?: T, merge?: Partial<T>, options?: OT): Result<T|undefined> {
        return this._copyMerger.merge(base, merge, options ?? this._options);
    }
}
