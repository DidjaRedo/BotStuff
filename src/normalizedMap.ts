"use strict";

export type ElementInitializer = (name: string, normalizedName: string, value: object) => object;
export type ElementUpdater = (existing: object, name: string, value: object) => object;

export interface LookupResults {
    found: object[];
    unknown: object[];
}

export class NormalizedMap {
    public constructor(initElement: ElementInitializer, replaceElement: ElementUpdater) {
        this.initElement = initElement;
        this.replaceElement = replaceElement;
        this.elements = {};
    }

    private initElement: ElementInitializer;
    private replaceElement: ElementUpdater;
    private elements: object;

    public addOrUpdate(name: string, value: object): object {
        let normalized = NormalizedMap.normalizeString(name);
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
        return this.elements[NormalizedMap.normalizeString(name)];
    }

    public lookupElements(names: string[]): LookupResults {
        let result = {
            found: [],
            unknown: [],
        };

        names.forEach((name): void => {
            let elem = this.tryGetElement(name);
            if (elem) {
                result.found.push(elem);
            }
            else {
                result.unknown.push(name.trim());
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
        let normalized = NormalizedMap.normalizeString(name);
        return this.elements.hasOwnProperty(normalized) && this.elements[normalized];
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

    public static normalizeString(input: string): string {
        if (typeof input !== "string") {
            throw new Error(`Cannot normalize an input of type ${typeof input}.`);
        }

        let trimmed = input.trim();
        if (trimmed.length < 1) {
            throw new Error("Cannot normalize an empty string.");
        }
        return trimmed.toLowerCase().replace(/[\W]/g, "");
    };

    public static normalizeStrings(input: string[]): string[] {
        let normalized = [];
        input.forEach((name): void => { normalized.push(NormalizedMap.normalizeString(name)); });
        return normalized;
    };

    public static normalize(input: string|string[]): string|string[] {
        if (Array.isArray(input)) {
            return NormalizedMap.normalizeStrings(input);
        }
        return NormalizedMap.normalizeString(input);
    };
};

