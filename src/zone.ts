'use strict';

// import { KeyedThing } from "./keyedThing";
import { Directory, LookupResult } from './directory';
import { Poi, NormalizedPoi, PoiLookupOptions } from './poi';
import { Names } from './names';

export interface ZoneOptions {
    ignoreOtherZones: boolean;
};

const _defaultOptions: ZoneOptions = {
    ignoreOtherZones: true,
};

export class Zone {
    public constructor(name: string, options?: ZoneOptions, pois?: Iterable<Poi>) {
        this._name = name;
        this._options = options || _defaultOptions;
        this._dir = new Directory(Poi.getDirectoryLookupOptions());
        if (pois) {
            this.addPois(pois);
        }
    }

    private _name: string;
    private _options: ZoneOptions;
    private _dir: Directory<Poi, NormalizedPoi>;

    public addPois(pois: Iterable<Poi>, options?: ZoneOptions): void {
        options = options || this._options;

        if (pois) {
            const myPois = [];
            for (const poi of pois) {
                if (poi.belongsToZone(this._name)) {
                    myPois.push(poi);
                }
                else if (!options.ignoreOtherZones) {
                    throw new Error(`POI "${poi.name}" does not belong to zone "${this._name}".`);
                }
            }

            if (myPois.length > 0) {
                this._dir.addRange(myPois);
            }
        }
    }

    public addPoi(poi: Poi, options?: ZoneOptions): void {
        options = options || this._options;

        if (!poi.belongsToZone(this._name)) {
            if (options.ignoreOtherZones) {
                return;
            }
            throw new Error(`POI "${poi.name}" does not belong to zone "${this._name}."`);
        }

        this._dir.add(poi.toKeyedThing());
    }

    public static adjustForCities(poiCandidates: Iterable<LookupResult<Poi>>, options: PoiLookupOptions): LookupResult<Poi>[] {
        if (!options.cities || (options.cities.length === 0)) {
            return Array.from(poiCandidates);
        }

        const matched: LookupResult<Poi>[] = [];
        const unmatched: LookupResult<Poi>[] = [];
        const cities = Names.normalizeStrings(options.cities);

        for (const candidate of poiCandidates) {
            if (cities.includes(candidate.item.normalized.city)) {
                matched.push(candidate);
            }
            else {
                unmatched.push({
                    item: candidate.item,
                    score: candidate.score * 0.75,
                });
            }
        }

        if ((matched.length === 0) || (!options.onlyMatchingCities)) {
            return unmatched;
        }
        return matched;
    }

    public tryGetPoisExact(name: string): LookupResult<Poi>[] {
        return this._dir.getKeyedThingsByAnyFieldExact(name).map((kt) => {
            return {
                item: kt.properties,
                score: 1.0,
            };
        });
    }

    public TryGetPoisFuzzy(name: string): LookupResult<Poi>[] {
        return this._dir.lookup(name);
    }

    public TryGetPois(name: string, options?: PoiLookupOptions): LookupResult<Poi>[] {
        let candidates: LookupResult<Poi>[] = [];
        options = options ?? {};

        if (options.noExactLookup !== true) {
            candidates = this.tryGetPoisExact(name);
        }

        if ((candidates.length < 1) && (options.noFuzzyLookup !== true)) {
            candidates = this.TryGetPoisFuzzy(name);
        }

        if ((candidates.length > 1) && (options.cities && (options.cities.length > 0))) {
            candidates = Zone.adjustForCities(candidates, options);
        }
        return candidates;
    }
};
