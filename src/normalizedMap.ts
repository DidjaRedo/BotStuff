"use strict";

import { Names } from "./names";

export type ElementInitializer = (name: string, normalizedName: string, value: object) => object;
export type ElementUpdater = (existing: object, name: string, value: object) => object;

export interface LookupResults {
    found: object[];
    unknown: object[];
}

export class NormalizedMap {
    public constructor(initElement?: ElementInitializer, replaceElement?: ElementUpdater) {
        this.initElement = initElement;
        this.replaceElement = replaceElement;
        this.elements = {};
    }

    private initElement: ElementInitializer;
    private replaceElement: ElementUpdater;
    private elements: object;

    public addOrUpdate(name: string, value: object): object {
        let normalized = Names.normalizeString(name);
        if (this.elements[normalized]) {
            if (this.replaceElement) {
                this.elements[normalized] = this.replaceElement(this.elements[normalized], name, value);
            }
            else {
                this.elements[normalized] = value;
            }
            return this.elements[normalized];
        }

        let elem = (this.initElement ? this.initElement(name, normalized, value) : value);
        this.elements[normalized] = elem;
        return elem;
    }

    public tryGetElement(name: string): object {
        return this.elements[Names.normalizeString(name)];
    }

    public lookupElements(names: string[]): LookupResults {
        let result = {
            found: [],
            unknown: [],
        };

        names.forEach((name): void => {
            let elem = this.tryGetElement(name);
            if (elem) {
                if (!result.found.includes(elem)) {
                    result.found.push(elem);
                }
            }
            else {
                name = Names.normalizeString(name);
                if (!result.unknown.includes(name)) {
                    result.unknown.push(name);
                }
            }
        });

        return result;
    }

    public getElements(names: string[]): object[] {
        let result = this.lookupElements(names);
        if (result.unknown.length > 0) {
            throw new Error(`Unknown names "${result.unknown.join(", ")}".`);
        }
        return result.found;
    }


    public tryGetElements(names: string[]): object[] {
        return this.lookupElements(names).found;
    }

    public forEach(func: (elem: object, key: string) => void): void {
        for (const key in this.elements) {
            if (this.elements.hasOwnProperty(key)) {
                func(this.elements[key], key);
            }
        }
    }

    public containsName(name: string): boolean {
        let normalized = Names.normalizeString(name);
        return (this.elements.hasOwnProperty(normalized) && this.elements[normalized]) ? true : false;
    }

    public select(selectFunc: (value: object, key: string) => object): object[] {
        let rtrn = [];
        this.forEach((value, key): void => {
            let next = selectFunc(value, key);
            if (next !== undefined) {
                rtrn.push(undefined);
            }
        });
        return rtrn;
    }

    public get keys(): string[] {
        return Object.keys(this.elements);
    }

    public get values(): string[] {
        return Object.values(this.elements);
    }

    public get size(): number {
        return Object.keys(this.elements).length;
    }
};

