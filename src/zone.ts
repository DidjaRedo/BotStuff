// import { KeyedThing } from "./keyedThing";
import { Directory, LookupResult } from './directory';
import { Poi, PoiLookupOptions, PoiKeys, PoiProperties } from './poi';
import { Names } from './names';
import { KeyedThing } from './keyedThing';

export interface ZoneOptions {
    failForUnknownZones: boolean;
};

export const DefaultZoneOptions: ZoneOptions = {
    failForUnknownZones: false,
};

export interface ZoneKeys {
    readonly name: string;
}

export interface ZoneProperties extends ZoneKeys {
    readonly name: string;
}

export class Zone implements ZoneProperties, KeyedThing<ZoneKeys> {
    public constructor(name: string, options?: ZoneOptions, pois?: Iterable<Poi>) {
        Names.validateName(name, 'zone name');

        this._name = name;
        this._options = options || DefaultZoneOptions;
        this._dir = new Directory(Poi.getDirectoryLookupOptions());
        if (pois) {
            this.addPois(pois);
        }
        this._keys = {
            name: Names.normalizeString(this._name),
        };
    }

    private _name: string;
    private _options: ZoneOptions;
    private _dir: Directory<Poi, PoiProperties, PoiKeys>;
    private _keys: ZoneKeys;

    public get name(): string {
        return this._name;
    }

    public get options(): ZoneOptions {
        return this._options;
    }

    public get primaryKey(): string {
        return this._keys.name;
    }

    public get keys(): ZoneKeys {
        return this._keys;
    }

    public get numPois(): number {
        return this._dir.size;
    }

    public addPois(pois: Iterable<Poi>, options?: ZoneOptions): void {
        options = options || this._options;

        if (pois) {
            const myPois = [];
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

    public addPoi(poi: Poi, options?: ZoneOptions): void {
        options = options || this._options;

        if (!poi.belongsToZone(this._name)) {
            if (!options.failForUnknownZones) {
                return;
            }
            throw new Error(`POI "${poi.name}" does not belong to zone "${this._name}."`);
        }

        this._dir.add(poi);
    }

    protected static adjustForCities(poiCandidates: Iterable<LookupResult<Poi>>, options: PoiLookupOptions): LookupResult<Poi>[] {
        /* istanbul ignore next */
        if (!options.cities || (options.cities.length === 0)) {
            return Array.from(poiCandidates);
        }

        const matched: LookupResult<Poi>[] = [];
        const unmatched: LookupResult<Poi>[] = [];
        const cities = Names.normalizeStrings(options.cities);

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

    public tryGetPoisExact(name: string): LookupResult<Poi>[] {
        return this._dir.getByAnyFieldExact(name).map((kt) => {
            return {
                item: kt,
                score: 1.0,
            };
        });
    }

    public tryGetPoisFuzzy(name: string): LookupResult<Poi>[] {
        return this._dir.lookup(name) ?? [];
    }

    public tryGetPois(name: string, options?: PoiLookupOptions): LookupResult<Poi>[] {
        let candidates: LookupResult<Poi>[] = [];
        options = options ?? {};

        if (options.noExactLookup !== true) {
            candidates = this.tryGetPoisExact(name);
        }

        if ((candidates.length < 1) && (options.noFuzzyLookup !== true)) {
            candidates = this.tryGetPoisFuzzy(name);
        }

        if ((candidates.length > 1) && (options.cities && (options.cities.length > 0))) {
            candidates = Zone.adjustForCities(candidates, options);
        }
        return candidates;
    }
};
