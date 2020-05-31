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
import { Poi, PoiDirectory } from './poi';
import { City } from './city';
import { LookupResult } from '../names/directory';
import { Names } from '../names/names';
import { NormalizedMap } from '../names/normalizedMap';
import { Zone } from './zone';

export abstract class GlobalPoiDirectoryBase<P extends Poi, PO extends PoiLookupOptions.Properties> {
    public readonly pois = new PoiDirectory<P>();
    public readonly zones = new NormalizedMap<Zone>();
    public readonly cities = new NormalizedMap<City>();

    public readonly options: PO;

    public constructor(options?: Partial<PO>, pois?: Iterable<P>) {
        this.options = this.getEffectiveOptions(options);

        for (const poi of pois ?? []) {
            this.add(poi);
        }
    }

    protected abstract getEffectiveOptions(user: Partial<PO>): PO;
    protected filterPoi(__poi: P, __options: PO): boolean {
        return true;
    }

    private updateZonesAndCities(poi: P): void {
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
        this.updateZonesAndCities(poi);
    }

    public tryGetPoisExact(name: string): LookupResult<P>[] {
        return this.pois.getByAnyFieldExact(name).map((p) => {
            return { item: p, score: 1 };
        });
    }

    public tryGetPoisFuzzy(name: string): LookupResult<P>[] {
        return this.pois.lookup(name);
    }

    public tryGetPois(name: string, userOptions?: Partial<PO>): LookupResult<P>[] {
        const options = this.getEffectiveOptions(userOptions);
        let candidates: LookupResult<P>[] = [];

        if (options.noExactLookup !== true) {
            candidates = this.tryGetPoisExact(name);
        }

        if ((candidates.length < 1) && (options.noFuzzyLookup !== true)) {
            candidates = this.tryGetPoisFuzzy(name);
        }

        if (candidates.length > 0) {
            candidates = PoiLookupOptions.adjustLookupResults(candidates, options, this.filterPoi);
        }

        return candidates;
    }
}

export class GlobalPoiDirectory<P extends Poi> extends GlobalPoiDirectoryBase<P, PoiLookupOptions.Properties> {
    protected getEffectiveOptions(user: Partial<PoiLookupOptions.Properties>): PoiLookupOptions.Properties {
        const base = this.options ?? PoiLookupOptions.Default;
        if (user) {
            return PoiLookupOptions.Merger.mergeIntoCopy(base, user).getValueOrThrow();
        }
        return base;
    }
}
