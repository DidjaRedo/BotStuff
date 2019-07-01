"use strict";

import { NamedThing } from "./keyedThing";
import { Utils } from "./utils";

import Fuse from "fuse.js";

export interface DirectoryKeyWeight<T> {
    name: keyof T;
    weight: number;
};

export interface DirectoryLookupOptions<T> {
    threshold: number;
    keys: DirectoryKeyWeight<T>[];
    primaryKeys?: (keyof T)[];
}

export class Directory<T extends object> {
    public constructor(options: DirectoryLookupOptions<T>, elements?: Iterable<NamedThing<T>>) {
        this._all = Utils.toArray(elements);
        this._byPrimaryKey = new Map<keyof T, Map<string, NamedThing<T>>>();
        this._options = options;
        this._fuseOptions = this._mergeFuseOptions(options);
        this._search = undefined;
        this.addElements(elements);
    }

    private _all: NamedThing<T>[];
    private _byPrimaryKey: Map<keyof T, Map<string, NamedThing<T>>>;
    private _search: Fuse<NamedThing<T>>;
    private _options: DirectoryLookupOptions<T>;
    private _fuseOptions: Fuse.FuseOptions<T>;

    private addElements(elements?: Iterable<NamedThing<T>>): void {
        if (elements) {
            for (let elem of elements) {
                this.addElement(elem);
            }
        }
    }

    private addElement(elem: NamedThing<T>): void {
        this._byPrimaryKey.set(elem.key, elem);
        this._search = undefined;
    }

    private _initSearch(): void {
        this._search = new Fuse(this._all, this._options);
    }

    private _mergeFuseOptions(options: DirectoryLookupOptions<T>): Fuse.FuseOptions<T> {
        return {
            shouldSort: true,
            caseSensitive: false,
            includeScore: true,
            threshold: 1 - options.threshold,
            location: 0,
            distance: 0,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            keys: options.keys,
        };
    }
};
