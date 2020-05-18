'use strict';

export interface NamedThing {
    name: string;
}

export interface Normalizable<T extends TN, TN extends NamedThing> {
    properties: T;
    normalized: TN;
};

export class Names {
    /* istanbul ignore next */
    private constructor() {} // eslint-disable-line

    public static isValidName(input: string): boolean {
        return (input && (input.trim().length > 0)) ? true : false;
    }

    public static validateName(input: string, description: string): void {
        if (!Names.isValidName(input)) {
            throw new Error(`${description} must be non-empty string.`);
        }
    }

    public static validateNames(input: Iterable<string>, description: string, minSize?: number): void {
        let count = 0;
        for (const str of input) {
            Names.validateName(str, description);
            count++;
        }
        if (minSize && (count < minSize)) {
            throw new Error(`Need at least ${minSize} ${description}`);
        }
    }

    public static normalizeString(input: string): string {
        if (typeof input !== 'string') {
            throw new Error(`Cannot normalize an input of type ${typeof input}.`);
        }

        const trimmed = input.trim();
        if (trimmed.length < 1) {
            throw new Error('Cannot normalize an empty string.');
        }
        return trimmed.toLowerCase().replace(/[\W]/g, '');
    };

    public static normalizeStrings(input: string[]): string[] {
        const normalized = [];
        input.forEach((name): void => { normalized.push(Names.normalizeString(name)); });
        return normalized;
    };

    public static normalize(input: string|string[]): string|string[] {
        if (Array.isArray(input)) {
            return Names.normalizeStrings(input);
        }
        return Names.normalizeString(input);
    };

    public static tryNormalizeString(input: string): string|undefined {
        if ((!input) || (input.trim().length < 1)) {
            return undefined;
        }
        return Names.normalizeString(input);
    }

    public static tryNormalizeStrings(input: string[]): string[]|undefined {
        const normalized = [];
        if (input && (input.length > 0)) {
            input.forEach((name): void => {
                name = Names.tryNormalizeString(name);
                if (name) {
                    normalized.push(name);
                }
            });
        }
        return ((normalized.length > 0) ? normalized : undefined);
    }

    public static tryNormalize(input: string|string[]): string|string[]|undefined {
        if (Array.isArray(input)) {
            return Names.tryNormalizeStrings(input);
        }
        return Names.tryNormalizeString(input);
    }
};

