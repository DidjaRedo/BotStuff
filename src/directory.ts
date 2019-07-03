"use strict";

import { NamedThing, Names } from "./names";
import { KeyedThing } from "./keyedThing";
import { Utils } from "./utils";

import Fuse = require("fuse.js");

export interface FieldSearchWeight<T> {
    name: keyof T;
    weight: number;
};

export interface DirectoryLookupOptions<T extends TN, TN extends NamedThing> {
    threshold: number;
    keys: FieldSearchWeight<T>[];
    alternateKeys?: (keyof TN)[];
}

export interface LookupResult<T> {
    score: number;
    item: T;
}

export class Directory<T extends TN, TN extends NamedThing> {
    public constructor(options: DirectoryLookupOptions<T, TN>, elements?: Iterable<KeyedThing<T, TN>>) {
        this._all = [];
        this._byKey = new Map<string, KeyedThing<T, TN>>();
        this._byAlternateKey = new Map<keyof TN, Map<string, KeyedThing<T, TN>>>();
        this._options = options;
        this._search = undefined;
        this.addRange(elements);
    }

    private _all: KeyedThing<T, TN>[];
    private _byKey: Map<string, KeyedThing<T, TN>>;
    private _byAlternateKey: Map<keyof TN, Map<string, KeyedThing<T, TN>>>;
    private _search: Fuse<T, { includeScore: true }>;
    private _options: DirectoryLookupOptions<T, TN>;

    private _validateItemDoesNotConflict(elem: KeyedThing<T, TN>): void {
        if (this._byKey.get(elem.key) !== undefined) {
            throw new Error(`Duplicate entries for key ${elem.key}.`);
        }

        if (this._options.alternateKeys) {
            this._options.alternateKeys.forEach((key: keyof TN): void => {
                const map = this._byAlternateKey.get(key);
                if (map) {
                    const value = elem.normalized[key];
                    if (value && (typeof value === "string") && (map.get(value) !== undefined)) {
                        throw new Error(`Duplicate entries for value "${value}" of "${key}".`);
                    }
                }
            });
        }
    }

    private _validateItemsDoNotConflict(elems: Iterable<KeyedThing<T, TN>>): void {
        const pending = new Map(Utils.select<keyof TN, [keyof TN|null, Set<string>]>(this._options.alternateKeys, (key: keyof TN): [keyof TN, Set<string>] => {
            return [key, new Set<string>()];
        }));
        pending.set(null, new Set<string>());

        for (const elem of elems) {
            this._validateItemDoesNotConflict(elem);

            let set = pending.get(null);
            if (set.has(elem.key)) {
                throw new Error(`Range to be addded has duplicate entries for key "${elem.key}".`);
            }
            set.add(elem.key);

            if (this._options.alternateKeys) {
                this._options.alternateKeys.forEach((k: keyof TN): void => {
                    const v = elem.normalized[k];
                    if (v && (typeof v === "string")) {
                        set = pending.get(k);
                        if (set.has(v)) {
                            throw new Error(`Range to be added has duplicate entries for "${v}" of "${k}".`);
                        }
                        set.add(v);
                    }
                });
            }
        }
    }

    // internal add does not validate
    private _add(elem: KeyedThing<T, TN>): KeyedThing<T, TN> {
        this._all.push(elem);
        this._byKey.set(elem.key, elem);

        if (this._options.alternateKeys) {
            this._options.alternateKeys.forEach((key: keyof TN): void => {
                let map = this._byAlternateKey.get(key);
                if (!map) {
                    map = new Map<string, KeyedThing<T, TN>>();
                    this._byAlternateKey.set(key, map);
                }
                const value = elem.normalized[key];
                if (value && (typeof value === "string")) {
                    map.set(value, elem);
                }
            });
        }

        this._search = undefined;
        return elem;
    }

    public add(elem: KeyedThing<T, TN>): KeyedThing<T, TN> {
        this._validateItemDoesNotConflict(elem);
        return this._add(elem);
    }

    public addRange(elements?: Iterable<KeyedThing<T, TN>>): void {
        if (elements) {
            this._validateItemsDoNotConflict(elements);
            for (let elem of elements) {
                this._add(elem);
            }
        }
    }

    private _initSearch(): void {
        const props = Utils.select(this._all, (e: KeyedThing<T, TN>): T => e.properties);
        this._search = new Fuse(props, {
            shouldSort: true,
            caseSensitive: false,
            includeMatches: true,
            includeScore: true,
            threshold: 1 - this._options.threshold,
            location: 0,
            distance: 0,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            keys: this._options.keys,
        });
    }

    public get size(): number {
        return this._all.length;
    }

    public get keys(): string[] {
        return Utils.toArray(this._byKey.keys()).sort();
    }

    public isAlternateKey(key: keyof TN): boolean {
        if (this._options && this._options.alternateKeys) {
            return this._options.alternateKeys.includes(key);
        }
        return false;
    }

    public get alternateKeys(): (keyof TN)[] {
        return this._options.alternateKeys || [];
    }

    public forEach(callback: {(item: T, key?: string)}): void {
        this._all.forEach((item: KeyedThing<T, TN>): void => {
            callback(item.properties, item.key);
        });
    }

    public forEachKeyedThing(callback: {(item: KeyedThing<T, TN>, key?: string)}): void {
        this._all.forEach((item: KeyedThing<T, TN>): void => {
            callback(item, item.key);
        });
    }

    public getNormalizedValues(props: T): TN {
        const elem = this.getKeyedThing(props.name);
        if (elem && (elem.properties !== props)) {
            throw new Error(`Directory element "${props.name}" does not match supplied object.`);
        }
        return (elem ? elem.normalized : undefined);
    }

    public getKeyedThing(name: string): KeyedThing<T, TN>|undefined {
        return this._byKey.get(Names.normalizeString(name));
    }

    public getKeyedThingByField(field: keyof TN, name: string): KeyedThing<T, TN>|undefined {
        const map = this._byAlternateKey.get(field);
        if (!this.isAlternateKey(field)) {
            throw new Error(`Field ${field} is not an alternate key.`);
        }
        return map && map.get(Names.normalizeString(name));
    }

    public get(name: string): T|undefined {
        const elem = this.getKeyedThing(name);
        return (elem ? elem.properties : undefined);
    }

    public getByField(field: keyof TN, name: string): T {
        const elem = this.getKeyedThingByField(field, name);
        return (elem ? elem.properties : undefined);
    }

    public lookup(name: string): LookupResult<T>[]|undefined {
        if (!this._search) {
            this._initSearch();
        }

        const matches = this._search.search(name);
        if (matches.length > 0) {
            return Utils.select(matches, (match: Fuse.FuseResult<T>): LookupResult<T> => {
                return {
                    item: match.item,
                    score: 1 - match.score,
                };
            });
        }

        return undefined;
    }
};
