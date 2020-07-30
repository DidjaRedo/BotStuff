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
import { City } from './city';
import { ExtendedArray } from '@fgv/ts-utils';
import { Names } from '../names/names';
import { NormalizedMap } from '../names/normalizedMap';
import { Poi } from './poi';
import { PoiDirectoryBase } from './poiDirectory';
import { ResultArray } from '../names/directory';
import { Zone } from './zone';

export abstract class GlobalPoiDirectoryBase<P extends Poi, PO extends PoiLookupOptions.Properties> {
    public readonly pois = new PoiDirectoryBase<P, PO>();
    public readonly zones = new NormalizedMap<Zone>();
    public readonly cities = new NormalizedMap<City>();

    public readonly options: PO;

    public constructor(options?: Partial<PO>, pois?: Iterable<P>) {
        this.options = this.getEffectiveOptions(options);

        for (const poi of pois ?? []) {
            this.add(poi);
        }
    }

    public add(poi: P): void {
        if (!Names.isListedOrDefault(this.options.allowedZones, poi.keys.zones)) {
            if (this.options.onNonAllowedZones === 'error') {
                throw new Error(`POI "${poi.name}" is not in an allowed zone.`);
            }
            return;
        }

        if (!Names.isListedOrDefault(this.options.allowedCities, poi.keys.city)) {
            if (this.options.onNonAllowedCities === 'error') {
                throw new Error(`POI "${poi.name}" is not in an allowed city.`);
            }
            return;
        }

        this.pois.add(poi);
        this._updateZonesAndCities(poi);
    }

    public getAll(options?: Partial<PO>): ExtendedArray<P> {
        const effectiveOptions = this.getEffectiveOptions(options);
        return this.pois.getAll(effectiveOptions);
    }

    public lookupExact(name: string): ResultArray<P> {
        return new ResultArray(name, ...this.pois.getByAnyFieldExact(name).map((p) => {
            return { item: p, score: 1 };
        }));
    }

    public lookupFuzzy(name: string): ResultArray<P> {
        return this.pois.searchByTextFields(name);
    }

    public lookup(name: string, userOptions?: Partial<PO>): ResultArray<P> {
        const options = this.getEffectiveOptions(userOptions);
        return this.pois.lookup(name, options, this._filterPoi);
    }

    protected _filterPoi(poi: P, options?: Partial<PoiLookupOptions.Properties>): boolean {
        return PoiLookupOptions.filterPoi(poi, options);
    }

    private _updateZonesAndCities(poi: P): void {
        const city = this.cities.getOrAdd(poi.city, City.create).getValueOrThrow();
        city.zones.addRange(poi.zones);
        city.pois.add(poi.name);

        for (const name of poi.zones) {
            if (Names.isListedOrDefault(this.options.allowedZones, name)) {
                const zone = this.zones.getOrAdd(name, Zone.create).getValueOrThrow();
                zone.cities.add(city.name);
                zone.pois.add(poi.name);
            }
        }
    }

    public abstract getEffectiveOptions(user?: Partial<PO>): PO;
}

export class GlobalPoiDirectory<P extends Poi> extends GlobalPoiDirectoryBase<P, PoiLookupOptions.Properties> {
    public getEffectiveOptions(user?: Partial<PoiLookupOptions.Properties>): PoiLookupOptions.Properties {
        const base = this.options ?? PoiLookupOptions.defaultProperties;
        if (user !== undefined) {
            // cannot be undefined because base is not undefined
            return PoiLookupOptions.merger.mergeIntoCopy(base, user).getValueOrThrow() as PoiLookupOptions.Properties;
        }
        return base;
    }
}
