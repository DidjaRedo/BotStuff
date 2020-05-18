'use strict';

export class Utils {
    /* istanbul ignore next */
    private constructor() {} // eslint-disable-line

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

export class GeoHelpers {
    /* istanbul ignore next */
    private constructor() {}; // eslint-disable-line

    public static MIN_LONGITUDE = -180.0;
    public static MAX_LONGITUDE = 180.0;
    public static MIN_LATITUDE = -180.0;
    public static MAX_LATITUDE = 180.0;

    public static isValidLongitude(longitude: number): boolean {
        return Number.isFinite(longitude) && (longitude >= GeoHelpers.MIN_LONGITUDE) && (longitude <= GeoHelpers.MAX_LONGITUDE);
    }

    public static isValidLatitude(latitude: number): boolean {
        return Number.isFinite(latitude) && (latitude >= GeoHelpers.MIN_LATITUDE) && (latitude <= GeoHelpers.MAX_LATITUDE);
    }

    public static validateLongitude(longitude: number): void {
        if (!this.isValidLongitude(longitude)) {
            throw new Error(`Invalid longitude ${longitude}.`);
        }
    }

    public static validateLatitude(latitude: number): void {
        if (!this.isValidLatitude(latitude)) {
            throw new Error(`Invalid latitude ${latitude}.`);
        }
    }
};
