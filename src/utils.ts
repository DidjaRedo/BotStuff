"use strict";

export class Utils {
    private constructor() {}

    public static select<T1, T2>(source: Iterable<T1>|undefined, selector: {(arg: T1): T2|undefined}): T2[] {
        const result: T2[] = [];
        if (source) {
            for (const sourceItem of source) {
                const transformed = selector(sourceItem);
                if (transformed !== undefined) {
                    result.push(transformed);
                }
            }
        }
        return result;
    }

    public static toArray<T>(source: Iterable<T>): T[] {
        return Utils.select(source, (elem: T): T => elem);
    }
};
