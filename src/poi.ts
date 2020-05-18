'use strict';

import { Names, NamedThing } from './names';
import { KeyedThing } from './keyedThing';
import { Utils, GeoHelpers } from './utils';
import { DirectoryLookupOptions } from './directory';

export interface PoiInitializer {
    name: string;
    alternateNames?: Iterable<string>;
    city: string;
    zones: Iterable<string>;
    latitude: number;
    longitude: number;
}

export interface PoiLookupOptions {
    zones?: string[];
    cities?: string[];
    noExactLookup?: boolean;
    noFuzzyLookup?: boolean;
    onlyMatchingCities?: boolean;
    onlyMatchingZones?: boolean;
}

export interface NormalizedPoi extends NamedThing {
    name: string;
    city: string;
    zones: string[];
    alternateNames?: string[];
}

export class Poi implements NormalizedPoi {
    public constructor(init: PoiInitializer) {
        Poi._validateInitializer(init);
        this._name = init.name;
        this._city = init.city;
        this._zones = Utils.toArray(init.zones);
        this._latitude = init.latitude;
        this._longitude = init.longitude;
        this._alternateNames = Utils.toArray(init.alternateNames);
        this._normalized = this._normalize();
    }

    private _name: string;
    private _alternateNames?: string[];
    private _city: string;
    private _zones: string[];
    private _latitude: number;
    private _longitude: number;
    private _normalized: NormalizedPoi;

    public get name(): string { return this._name; }
    public get city(): string { return this._city; }
    public get zones(): string[] { return this._zones; }
    public get latitude(): number { return this._latitude; }
    public get longitude(): number { return this._longitude; }

    public get hasAlternateNames(): boolean { return this._alternateNames && (this._alternateNames.length > 0); }
    /* istanbul ignore next */
    public get numAlternateNames(): number { return this._alternateNames ? this._alternateNames.length : 0; }
    public get alternateNames(): string[] { return this._alternateNames; }

    public belongsToZone(zones: string|Iterable<string>): boolean {
        if (!zones) {
            throw new Error('Invalid argument - must supply at least one valid zone name to belongsToZone.');
        }

        zones = (typeof zones === 'string') ? [zones] : zones;
        let match = false;
        for (const zone of zones) {
            if (!Names.isValidName(zone)) {
                throw new Error(`Invalid zone name "${zone}".`);
            }
            match = match || this._normalized.zones.includes(Names.normalizeString(zone));
        }
        return match;
    }

    private _normalize(): NormalizedPoi {
        return {
            name: Names.normalizeString(this._name),
            city: Names.normalizeString(this._city),
            zones: Names.normalizeStrings(this._zones),
            alternateNames: Names.normalizeStrings(this._alternateNames),
        };
    }

    public get normalized(): NormalizedPoi {
        return this._normalized;
    }

    public toKeyedThing(): KeyedThing<Poi, NormalizedPoi> {
        return new KeyedThing({ properties: this, normalized: this._normalized });
    }

    private static _validateInitializer(init: PoiInitializer): void {
        Names.validateName(init.name, 'poi name');
        Names.validateName(init.city, 'city name');
        Names.validateNames(init.zones, 'zone name', 1);
        GeoHelpers.validateLatitude(init.latitude);
        GeoHelpers.validateLongitude(init.longitude);
        if (init.alternateNames) {
            Names.validateNames(init.alternateNames, 'alternate name');
        }
    }

    public static getDirectoryLookupOptions(): DirectoryLookupOptions<Poi, NormalizedPoi> {
        return {
            threshold: 0.8,
            keys: [
                {
                    name: 'name',
                    weight: 0.7,
                },
                {
                    name: 'alternateNames',
                    weight: 0.3,
                },
            ],
            alternateKeys: ['alternateNames'],
        };
    }
};
