import { NamedThing, Names } from './names';
import { KeyedThing } from './keyedThing';
import { Utils } from './utils';

import Fuse = require('fuse.js');

export interface FieldSearchWeight<T> {
    name: keyof T;
    weight: number;
};

export interface DirectoryLookupOptions<T extends KeyedThing<TK> & TS, TS extends TK, TK extends NamedThing> {
    threshold: number;
    textSearchKeys: FieldSearchWeight<TS>[];
    alternateKeys?: (keyof TK)[];
}

export interface LookupResult<T> {
    score: number;
    item: T;
}

// TK are the keys
// TS are the searchable properties
// T is the instantiated object
export class Directory<T extends KeyedThing<TK> & TS, TS extends TK, TK extends NamedThing> {
    public constructor(options: DirectoryLookupOptions<T, TS, TK>, elements?: Iterable<T>) {
        this._all = [];
        this._byKey = new Map<string, T>();
        this._byAlternateKey = new Map<keyof TK, Map<string, T>>();
        this._options = options;
        this._search = undefined;
        this.addRange(elements);
    }

    private _all: T[];
    private _byKey: Map<string, T>;
    private _byAlternateKey: Map<keyof TK, Map<string, T>>;
    private _search: Fuse<T, { includeScore: true }>;
    private _options: DirectoryLookupOptions<T, TS, TK>;

    private _validateItemDoesNotConflict(elem: T): void {
        if (this._byKey.get(elem.primaryKey) !== undefined) {
            throw new Error(`Duplicate entries for key ${elem.primaryKey}.`);
        }

        if (this._options.alternateKeys) {
            this._options.alternateKeys.forEach((key: keyof TK): void => {
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
            });
        }
    }

    private _validateItemsDoNotConflict(elems: Iterable<T>): void {
        const pending = new Map(Utils.select<keyof TK, [keyof TK|null, Set<string>]>(this._options.alternateKeys, (key: keyof TK): [keyof TK, Set<string>] => {
            return [key, new Set<string>()];
        }));
        pending.set(null, new Set<string>());

        for (const elem of elems) {
            this._validateItemDoesNotConflict(elem);

            let set = pending.get(null);
            if (set.has(elem.primaryKey)) {
                throw new Error(`Range to be addded has duplicate entries for key "${elem.primaryKey}".`);
            }
            set.add(elem.primaryKey);

            if (this._options.alternateKeys) {
                this._options.alternateKeys.forEach((k: keyof TK): void => {
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
                });
            }
        }
    }

    // internal add does not validate
    private _add(elem: T): T {
        this._all.push(elem);
        this._byKey.set(elem.primaryKey, elem);

        if (this._options.alternateKeys) {
            this._options.alternateKeys.forEach((key: keyof TK): void => {
                let map = this._byAlternateKey.get(key);
                if (!map) {
                    map = new Map<string, T>();
                    this._byAlternateKey.set(key, map);
                }
                const altKeyValue = elem.keys[key];
                const values = Array.isArray(altKeyValue) ? altKeyValue : [altKeyValue];
                for (const v of values) {
                    /* istanbul ignore else */
                    if (v && (typeof v === 'string')) {
                        map.set(v, elem);
                    }
                }
            });
        }

        this._search = undefined;
        return elem;
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

    private _initSearch(): void {
        this._search = new Fuse(this._all, {
            shouldSort: true,
            caseSensitive: false,
            includeMatches: true,
            includeScore: true,
            threshold: 1 - this._options.threshold,
            location: 0,
            distance: 0,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            keys: this._options.textSearchKeys,
        });
    }

    public get size(): number {
        return this._all.length;
    }

    public get keys(): string[] {
        return Utils.toArray(this._byKey.keys()).sort();
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
        return this._byKey.get(Names.normalizeString(name));
    }

    public getByField(field: keyof TK, name: string): T|undefined {
        const map = this._byAlternateKey.get(field);
        if (!this.isAlternateKey(field)) {
            throw new Error(`Field ${field} is not an alternate key.`);
        }
        return map && map.get(Names.normalizeString(name));
    }

    public getByAnyFieldExact(name: string): T[] {
        const wantKey = Names.normalizeString(name);
        const altKeys = this.alternateKeys;

        /* istanbul ignore next */
        const rtrn = [
            this._byKey.get(wantKey),
            ...altKeys.map((k) => this._byAlternateKey.get(k)?.get(wantKey)),
        ].filter((t) => t !== undefined);
        return rtrn;
    }

    public lookup(name: string): LookupResult<T>[]|undefined {
        if (!this._search) {
            this._initSearch();
        }

        const matches = this._search.search(name);
        if (matches.length > 0) {
            return Utils.select(matches, (match: Fuse.FuseResultWithScore<T>): LookupResult<T> => {
                return {
                    item: match.item,
                    score: 1 - match.score,
                };
            });
        }

        return undefined;
    }
};
