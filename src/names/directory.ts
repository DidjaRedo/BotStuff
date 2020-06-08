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

import { NamedThing, Names } from './names';
import Fuse from 'fuse.js';
import { KeyedThing } from './keyedThing';


export interface FieldSearchWeight<T> {
    name: keyof T;
    weight: number;
}

function toFuseKeys<T>(fsws: FieldSearchWeight<T>[]): Fuse.FuseOptionKeyObject[] {
    return fsws.map((f): Fuse.FuseOptionKeyObject => {
        return {
            name: f.name.toString(),
            weight: f.weight,
        };
    });
}

export interface DirectoryOptions<T extends KeyedThing<TK> & TS, TS extends TK, TK extends NamedThing> {
    threshold: number;
    textSearchKeys: FieldSearchWeight<TS>[];
    alternateKeys?: (keyof TK)[];
    enforceAlternateKeyUniqueness?: (keyof TK)[];
}

export interface DirectoryLookupOptions {
    noTextSearch?: boolean;
    noExactLookup?: boolean;
}

export interface SearchResult<T> {
    score: number;
    item: T;
}

export type DirectoryFilter<T, TO> = (item: T, options: TO) => boolean;

// TK are the keys
// TS are the searchable properties
// T is the instantiated object
// TLO is lookup options
export abstract class DirectoryBase<T extends KeyedThing<TK> & TS, TS extends TK, TK extends NamedThing, TLO extends DirectoryLookupOptions> {
    private _all: T[];
    private _byKey: Map<string, T>;
    private _byAlternateKey: Map<keyof TK, Map<string, T|T[]>>;
    private _search: Fuse<T, { includeScore: true }>;
    private _options: DirectoryOptions<T, TS, TK>;

    public constructor(options: DirectoryOptions<T, TS, TK>, elements?: Iterable<T>) {
        this._all = [];
        this._byKey = new Map<string, T>();
        this._byAlternateKey = new Map<keyof TK, Map<string, T|T[]>>();
        this._options = options;
        this._search = undefined;
        this.addRange(elements);
    }

    public add(elem: T): T {
        this._validateItemDoesNotConflict(elem);
        return this._add(elem);
    }

    public addRange(elements?: Iterable<T>): void {
        if (elements) {
            this._validateItemsDoNotConflict(elements);
            for (const elem of elements) {
                this._add(elem);
            }
        }
    }

    public isAlternateKey(key: keyof TK): boolean {
        /* istanbul ignore next */
        return this._options?.alternateKeys?.includes(key) ?? false;
    }

    public get alternateKeys(): (keyof TK)[] {
        return this._options.alternateKeys || [];
    }

    public forEach(callback: {(item: T, key?: string)}): void {
        this._all.forEach((item: T): void => {
            callback(item, item.primaryKey);
        });
    }

    public getKeys(props: T): TK|undefined {
        const elem = this.get(props.primaryKey);
        if (elem && (elem !== props)) {
            throw new Error(`Directory element "${props.primaryKey}" does not match supplied object.`);
        }
        return elem?.keys;
    }

    public get(name: string): T|undefined {
        return this._byKey.get(Names.normalizeOrThrow(name));
    }

    public getByFieldExact(field: keyof TK, name: string): T[] {
        if (!this.isAlternateKey(field)) {
            throw new Error(`Field ${field} is not an alternate key.`);
        }

        const map = this._byAlternateKey.get(field);
        const result = map?.get(Names.normalizeOrThrow(name));
        if (result === undefined) {
            return [];
        }
        else if (!Array.isArray(result)) {
            return [result];
        }
        return result;
    }

    public getByAnyFieldExact(name: string): T[] {
        const wantKey = Names.normalizeOrThrow(name);
        const altKeys = this.alternateKeys;

        const raw = [
            [this._byKey.get(wantKey)],
            ...altKeys.map((k) => {
                const got = this._byAlternateKey.get(k)?.get(wantKey);
                return Array.isArray(got) ? got : [got];
            }),
        ].filter((t)=> t[0] !== undefined);
        const merged = raw.reduce((a, c) => a.concat(c), []);
        return merged;
    }

    public searchByTextFields(name: string): SearchResult<T>[] {
        if (!this._search) {
            this._initSearch();
        }

        const matches = this._search.search(name);
        if (matches.length > 0) {
            return matches.map((match: Fuse.FuseResult<T>): SearchResult<T> => {
                return {
                    item: match.item,
                    score: 1 - match.score,
                };
            });
        }

        return [];
    }

    public lookup(name: string, options?: TLO, filter?: DirectoryFilter<T, TLO>): SearchResult<T>[] {
        const effectiveOptions: DirectoryLookupOptions = options ?? {};
        let candidates: SearchResult<T>[] = [];

        if (effectiveOptions.noExactLookup !== true) {
            candidates = this.getByAnyFieldExact(name).map((v) => {
                return { item: v, score: 1 };
            });
        }

        if ((candidates.length < 1) && (effectiveOptions.noTextSearch !== true)) {
            candidates = this.searchByTextFields(name);
        }

        if (candidates.length > 0) {
            candidates = this._adjustLookupResults(candidates, options, filter);
        }

        return candidates;
    }

    private _isUniqueKey(key: keyof TK): boolean {
        /* istanbul ignore next */
        return (this._options.alternateKeys?.includes(key) === true)
            && (this._options.enforceAlternateKeyUniqueness?.includes(key) === true);
    }

    private _hasUniqueKeys(): boolean {
        return (this._options.alternateKeys?.length > 0) && (this._options.enforceAlternateKeyUniqueness?.length > 0);
    }

    private _validateItemDoesNotConflict(elem: T): void {
        if (this._byKey.get(elem.primaryKey) !== undefined) {
            throw new Error(`Duplicate entries for key ${elem.primaryKey}.`);
        }

        if (this._hasUniqueKeys()) {
            for (const key of this._options.alternateKeys) {
                /* istanbul ignore next */
                if (this._isUniqueKey(key)) {
                    const map = this._byAlternateKey.get(key);
                    if (map) {
                        const altKeyValue = elem.keys[key];
                        const values = Array.isArray(altKeyValue) ? altKeyValue : [altKeyValue];
                        for (const v of values) {
                            /* istanbul ignore else */
                            if (typeof v === 'string') {
                                if (map.get(v) !== undefined) {
                                    throw new Error(`Duplicate entries for value "${v}" of "${key}".`);
                                }
                            }
                            else if (v !== undefined) {
                                throw new Error('Key property must be string or array of strings.');
                            }
                        }
                    }
                }
            }
        }
    }

    private _validateItemsDoNotConflict(elems: Iterable<T>): void {
        const pending = new Map(this._options.alternateKeys?.map((k) => {
            return [k, new Set<string>()];
        }));
        pending.set(null, new Set<string>());

        for (const elem of elems) {
            this._validateItemDoesNotConflict(elem);

            let set = pending.get(null);
            if (set.has(elem.primaryKey)) {
                throw new Error(`Range to be addded has duplicate entries for key "${elem.primaryKey}".`);
            }
            set.add(elem.primaryKey);

            if (this._hasUniqueKeys()) {
                for (const k of this._options.alternateKeys) {
                    /* istanbul ignore next */
                    if (this._isUniqueKey(k)) {
                        const altKeyValue = elem.keys[k];
                        const values = Array.isArray(altKeyValue) ? altKeyValue : [altKeyValue];
                        set = pending.get(k);

                        for (const v of values) {
                            /* istanbul ignore else */
                            if (typeof v === 'string') {
                                if (set.has(v)) {
                                    throw new Error(`Range to be added has duplicate entries for "${v}" of "${k}".`);
                                }
                                set.add(v);
                            }
                            else if (v !== undefined) {
                                throw new Error('Key property must be string or array of strings.');
                            }
                        }
                    }
                }
            }
        }
    }

    // internal add does not validate
    private _add(elem: T): T {
        this._all.push(elem);
        this._byKey.set(elem.primaryKey, elem);

        for (const key of this._options.alternateKeys ?? []) {
            const altKeyValue = elem.keys[key];
            /* istanbul ignore else */
            if (altKeyValue !== undefined) {
                const values = Array.isArray(altKeyValue) ? altKeyValue : [altKeyValue];
                if (values.length > 0) {
                    let map = this._byAlternateKey.get(key);
                    if (!map) {
                        map = new Map<string, T>();
                        this._byAlternateKey.set(key, map);
                    }
                    for (const v of values) {
                        /* istanbul ignore else */
                        if (typeof v === 'string') {
                            const existing = map.get(v);
                            if (Array.isArray(existing)) {
                                existing.push(elem);
                            }
                            else if (existing) {
                                map.set(v, [existing, elem]);
                            }
                            else {
                                map.set(v, elem);
                            }
                        }
                        else if (v !== undefined) {
                            throw new Error('Key property must be string or array of strings');
                        }
                    }
                }
            }
        }

        this._search = undefined;
        return elem;
    }

    private _initSearch(): void {
        this._search = new Fuse<T, Fuse.IFuseOptions<T>>(this._all, {
            shouldSort: true,
            isCaseSensitive: false,
            includeMatches: true,
            includeScore: true,
            threshold: 1 - this._options.threshold,
            location: 0,
            distance: 0,
            minMatchCharLength: 1,
            keys: toFuseKeys(this._options.textSearchKeys),
        });
    }

    public get size(): number {
        return this._all.length;
    }

    public get keys(): string[] {
        return Array.from(this._byKey.keys());
    }

    protected abstract _adjustLookupResults(
        results: SearchResult<T>[],
        options?: TLO,
        filter?: DirectoryFilter<T, TLO>,
    ): SearchResult<T>[];
}

export class Directory<T extends KeyedThing<TK> & TS, TS extends TK, TK extends NamedThing> extends DirectoryBase<T, TS, TK, DirectoryLookupOptions> {
    public constructor(options: DirectoryOptions<T, TS, TK>, elements?: Iterable<T>) {
        super(options, elements);
    }

    protected _adjustLookupResults(
        results: SearchResult<T>[],
        options?: DirectoryLookupOptions,
        filter?: DirectoryFilter<T, DirectoryLookupOptions>,
    ): SearchResult<T>[] {
        // istanbul ignore next
        if (filter) {
            return results.filter((item) => filter(item.item, options));
        }
        return results;
    }
}
