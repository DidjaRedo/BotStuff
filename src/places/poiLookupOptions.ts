/*
 * Copyright (c) 2020 Erik Fortune
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import * as Merge from '../utils/merge';
import { Coordinate, Region } from '../utils/geo';
import { DirectoryLookupOptions, SearchResult } from '../names/directory';
import { Poi } from './poi';

export const DEFAULT_RADIUS = 1000;

export interface Properties extends DirectoryLookupOptions {
    allowedZones: string[];
    allowedCities: string[];
    onNonAllowedZones: 'error'|'ignore';
    onNonAllowedCities: 'error'|'ignore';
    preferredCities: string[];
    preferredZones: string[];
    near?: Coordinate;
    radius?: number;
    region?: Region;
    noTextSearch?: boolean;
    noExactLookup?: boolean;
}

export const defaultProperties: Properties = {
    allowedZones: [],
    allowedCities: [],
    onNonAllowedCities: 'ignore',
    onNonAllowedZones: 'ignore',
    preferredCities: [],
    preferredZones: [],
    radius: DEFAULT_RADIUS,
};

export const fieldMergers: Merge.FieldMergers<Properties, Merge.MergeOptions> = {
    options: {
        ...Merge.defaultMergeOptions,
        onUnknownField: 'ignore',
    },
    mergers: {
        allowedZones: Merge.normalizedStringArray,
        allowedCities: Merge.normalizedStringArray,
        onNonAllowedCities: Merge.item<'error'|'ignore'>(),
        onNonAllowedZones: Merge.item<'error'|'ignore'>(),
        preferredCities: Merge.normalizedStringArray,
        preferredZones: Merge.normalizedStringArray,
        near: Merge.item<Coordinate|undefined>(),
        radius: Merge.optionalNumber,
        region: Merge.item<Region|undefined>(),
        noTextSearch: Merge.optionalBoolean,
        noExactLookup: Merge.optionalBoolean,
    },
};

export const merger = new Merge.ObjectMerger<Properties, Merge.MergeOptions>(fieldMergers);

export type PoiFilter<P extends Poi, PO extends Properties> = (poi: P, options?: Partial<PO>) => boolean;

export interface CategorizedObjects<OT> {
    matched: OT[];
    inPreferredCity: OT[];
    inPreferredZone: OT[];
    unmatched: OT[];
    filteredOut: OT[];
    disallowed: OT[];
}

export type CategorizedPois<P extends Poi> = CategorizedObjects<P>;
export type PoiCategories<OT> = keyof CategorizedObjects<OT>;

export function filterPoi<P extends Poi, PO extends Properties>(poi: P, options?: Partial<PO>): boolean {
    return (options === undefined) || (poi.isNear(options.near, options.radius) && poi.isInRegion(options.region));
}

export function categorizePoi<P extends Poi, PO extends Properties>(poi: P, options?: Partial<PO>, filter?: PoiFilter<P, PO>): PoiCategories<P> {
    if ((filter && !filter(poi, options)) || !filterPoi(poi, options)) {
        return 'filteredOut';
    }

    if (poi.matches(options?.allowedZones, options?.allowedCities)) {
        const inPreferredCity = poi.matchesCities(options?.preferredCities);
        const inPreferredZone = poi.matchesZones(options?.preferredZones);

        if (inPreferredCity) {
            return inPreferredZone ? 'matched' : 'inPreferredCity';
        }
        else if (inPreferredZone) {
            return 'inPreferredZone';
        }
        return 'unmatched';
    }
    return 'disallowed';
}

export function categorizeObjects<OT, P extends Poi, PO extends Properties>(
    objects: OT[],
    getPoi: (from: OT) => P,
    options?: Partial<PO>,
    filter?: PoiFilter<P, PO>
): CategorizedObjects<OT> {
    const categorized: CategorizedObjects<OT> = {
        matched: [],
        inPreferredCity: [],
        inPreferredZone: [],
        filteredOut: [],
        unmatched: [],
        disallowed: [],
    };

    for (const obj of objects) {
        categorized[categorizePoi(getPoi(obj), options, filter)].push(obj);
    }

    return categorized;
}

export function categorizePois<P extends Poi, PO extends Properties>(pois: P[], options?: PO, filter?: PoiFilter<P, PO>): CategorizedPois<P> {
    return categorizeObjects(pois, (p) => p, options, filter);
}

export function adjustObjectSearchResults<T, P extends Poi, PO extends Properties>(
    candidates: SearchResult<T>[],
    options: Partial<PO>|undefined,
    extract: (wrapper: T) => P,
    filter?: PoiFilter<P, PO>,
): SearchResult<T>[] {
    const categorized = categorizeObjects(candidates, (c) => extract(c.item), options, filter);

    let adjusted = Array.from(categorized.matched);
    if (adjusted.length < 1) {
        let fallback: SearchResult<T>[]|undefined = undefined;
        let multiplier = 1.0;

        if (categorized.inPreferredCity.length > 0) {
            fallback = categorized.inPreferredCity;
            multiplier = 0.9;
        }
        else if (categorized.inPreferredZone.length > 0) {
            fallback = categorized.inPreferredZone;
            multiplier = 0.8;
        }
        else {
            fallback = categorized.unmatched;
            multiplier = 0.7;
        }

        if (fallback.length > 0) {
            adjusted = fallback.map((c) => { return { item: c.item, score: c.score * multiplier }; });
        }
    }
    return adjusted.sort((c1, c2) => c2.score - c1.score);
}

export function adjustSearchResults<P extends Poi, PO extends Properties>(
    candidates: SearchResult<P>[],
    options?: Partial<PO>,
    filter?: PoiFilter<P, PO>,
): SearchResult<P>[] {
    return adjustObjectSearchResults(candidates, options, (c) => c, filter);
}
