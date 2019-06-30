"use strict";

export interface Normalizable<T extends object> {
    properties: T;
    normalize(): T;
};

export class Names {
    private constructor() {}

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
        input.forEach((name): void => { normalized.push(Names.normalizeString(name)); });
        return normalized;
    };

    public static normalize(input: string|string[]): string|string[] {
        if (Array.isArray(input)) {
            return Names.normalizeStrings(input);
        }
        return Names.normalizeString(input);
    };
};
