"use strict";

export class Utils {
    private constructor() {}

    public static select<T1, T2>(source: Iterable<T1>, selector: {(arg: T1): T2|undefined}): T2[] {
        const result: T2[] = [];
        for (const sourceItem of source) {
            const transformed = selector(sourceItem);
            if (transformed !== undefined) {
                result.push(transformed);
            }
        }
        return result;
    }
};
