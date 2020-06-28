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
import * as PoiLookupOptions from './poiLookupOptions';
import { KeyedThing } from '../names/keyedThing';
import { Names } from '../names/names';
import { Poi } from './poi';
import { PoiDirectoryBase } from './poiDirectory';
import { SearchResult } from '../names/directory';

export interface ZonePoiDirectoryOptions {
    failForUnknownZones: boolean;
}

export const defaultZonePoiDirectoryOptions: ZonePoiDirectoryOptions = {
    failForUnknownZones: false,
};

export interface ZonePoiLookupOptions {
    zones?: string[];
    cities?: string[];
    noExactLookup?: boolean;
    noFuzzyLookup?: boolean;
    onlyMatchingCities?: boolean;
    onlyMatchingZones?: boolean;
}

export interface ZonePoiDirectoryKeys {
    readonly name: string;
}

export interface ZonePoiDirectoryProperties extends ZonePoiDirectoryKeys {
    readonly name: string;
}

export class ZonePoiDirectoryBase<P extends Poi> implements ZonePoiDirectoryProperties, KeyedThing<ZonePoiDirectoryKeys> {
    public get name(): string { return this._name; }
    public get options(): ZonePoiDirectoryOptions { return this._options; }
    public get primaryKey(): string { return this._keys.name; }
    public get keys(): ZonePoiDirectoryKeys { return this._keys; }
    public get numPois(): number { return this._dir.size; }

    private _name: string;
    private _options: ZonePoiDirectoryOptions;
    private _dir: PoiDirectoryBase<P, PoiLookupOptions.Properties>;
    private _keys: ZonePoiDirectoryKeys;

    public constructor(name: string, options?: ZonePoiDirectoryOptions, pois?: Iterable<P>) {
        Names.throwOnInvalidName(name, 'zone name');

        this._name = name;
        this._options = options || defaultZonePoiDirectoryOptions;
        this._dir = new PoiDirectoryBase<P, PoiLookupOptions.Properties>();
        if (pois) {
            this.addPois(pois);
        }
        this._keys = {
            name: Names.normalizeOrThrow(this._name),
        };
    }

    protected static _adjustForCities<P extends Poi>(poiCandidates: Iterable<SearchResult<P>>, options: ZonePoiLookupOptions): SearchResult<P>[] {
        /* istanbul ignore next */
        if (!options.cities || (options.cities.length === 0)) {
            return Array.from(poiCandidates);
        }

        const matched: SearchResult<P>[] = [];
        const unmatched: SearchResult<P>[] = [];
        const cities = Names.normalizeOrThrow(options.cities);

        for (const candidate of poiCandidates) {
            if (cities.includes(candidate.item.keys.city)) {
                matched.push(candidate);
            }
            else {
                unmatched.push({
                    item: candidate.item,
                    score: candidate.score * 0.75,
                });
            }
        }

        if ((matched.length === 0) && (options.onlyMatchingCities !== true)) {
            return unmatched;
        }
        return matched;
    }

    public addPois(pois: Iterable<P>, options?: ZonePoiDirectoryOptions): void {
        options = options || this._options;

        if (pois) {
            const myPois: P[] = [];
            for (const poi of pois) {
                if (poi.belongsToZone(this._name)) {
                    myPois.push(poi);
                }
                else if (options.failForUnknownZones) {
                    throw new Error(`POI "${poi.name}" does not belong to zone "${this._name}".`);
                }
            }

            if (myPois.length > 0) {
                this._dir.addRange(myPois);
            }
        }
    }

    public addPoi(poi: P, options?: ZonePoiDirectoryOptions): void {
        options = options || this._options;

        if (!poi.belongsToZone(this._name)) {
            if (!options.failForUnknownZones) {
                return;
            }
            throw new Error(`POI "${poi.name}" does not belong to zone "${this._name}."`);
        }

        this._dir.add(poi);
    }

    public tryGetPoisExact(name: string): SearchResult<P>[] {
        return this._dir.getByAnyFieldExact(name).map((kt) => {
            return {
                item: kt,
                score: 1.0,
            };
        });
    }

    public tryGetPoisFuzzy(name: string): SearchResult<P>[] {
        return this._dir.searchByTextFields(name);
    }

    public tryGetPois(name: string, options?: ZonePoiLookupOptions): SearchResult<P>[] {
        let candidates: SearchResult<P>[] = [];
        options = options ?? {};

        if (options.noExactLookup !== true) {
            candidates = this.tryGetPoisExact(name);
        }

        if ((candidates.length < 1) && (options.noFuzzyLookup !== true)) {
            candidates = this.tryGetPoisFuzzy(name);
        }

        if ((candidates.length > 1) && (options.cities && (options.cities.length > 0))) {
            candidates = ZonePoiDirectoryBase._adjustForCities(candidates, options);
        }
        return candidates;
    }
}

export class ZonePoiDirectory extends ZonePoiDirectoryBase<Poi> {
    public constructor(name: string, options?: ZonePoiDirectoryOptions, pois?: Iterable<Poi>) {
        super(name, options, pois);
    }
}

