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
import * as Geo from '../utils/geo';
import { NamedThing, Names } from '../names/names';
import { Result, captureResult } from '../utils/result';
import { validateLatitude, validateLongitude } from '../utils/geo';
import { DirectoryOptions } from '../names/directory';
import { JsonObject } from '../utils/jsonHelpers';
import { KeyedThing } from '../names/keyedThing';
import { Utils } from '../utils/utils';

export interface PoiKeys extends NamedThing {
    name: string;
    city: string;
    zones: string[];
    alternateNames?: string[];
}

export interface PoiProperties extends PoiKeys {
    name: string;
    city: string;
    zones: string[];
    alternateNames?: string[];
    coord: Geo.Coordinate;
}

export const DEFAULT_NEAR_RADIUS = 1000;

export class Poi implements PoiProperties, KeyedThing<PoiKeys> {
    private _name: string;
    private _alternateNames: string[];
    private _city: string;
    private _zones: string[];
    private _coord: Geo.Coordinate;
    private _keys: PoiKeys;
    public get primaryKey(): string { return this._keys.name; }
    public get name(): string { return this._name; }
    public get city(): string { return this._city; }
    public get zones(): string[] { return this._zones; }
    public get coord(): Geo.Coordinate { return this._coord; }

    public get hasAlternateNames(): boolean { return (this._alternateNames.length > 0); }
    public get numAlternateNames(): number { return this._alternateNames.length; }
    public get alternateNames(): string[] { return this._alternateNames; }

    public constructor(init: PoiProperties) {
        Poi._validateInitializer(init);
        this._name = init.name;
        this._city = init.city;
        this._zones = Utils.toArray(init.zones);
        this._coord = init.coord;
        this._alternateNames = Utils.toArray(init.alternateNames);
        this._keys = this._normalize();
    }

    public static createPoi(init: PoiProperties): Result<Poi> {
        return captureResult(() => new Poi(init));
    }

    public static getDirectoryOptions(): DirectoryOptions<Poi, PoiProperties, PoiKeys> {
        return {
            threshold: 0.7,
            textSearchKeys: [
                {
                    name: 'name',
                    weight: 0.6,
                },
                {
                    name: 'alternateNames',
                    weight: 0.4,
                },
            ],
            alternateKeys: ['alternateNames'],
        };
    }

    private static _validateInitializer(init: PoiProperties): void {
        Names.throwOnInvalidName(init.name, 'poi name');
        Names.throwOnInvalidName(init.city, 'city name');
        Names.throwOnInvalidName(init.zones, 'zone name', 1);
        validateLatitude(init.coord.latitude).getValueOrThrow();
        validateLongitude(init.coord.longitude).getValueOrThrow();
        if (init.alternateNames) {
            Names.throwOnInvalidName(init.alternateNames, 'alternate name');
        }
    }

    public getDirectionsLink(): string {
        return `https://www.google.com/maps/dir/?api=1&destination=${this.coord.latitude},${this.coord.longitude}`;
    }

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
            match = match || this._keys.zones.includes(Names.normalizeOrThrow(zone));
        }
        return match;
    }

    public matchesCities(cities?: string[]): boolean {
        return Names.isListedOrDefault(cities, this._city);
    }

    public matchesZones(zones?: string[]): boolean {
        return Names.isListedOrDefault(zones, this._zones);
    }

    public matches(zones?: string[], cities?: string[]): boolean {
        return Names.isListedOrDefault(zones, this._zones)
            && Names.isListedOrDefault(cities, this.city);
    }

    public isNear(coord?: Geo.Coordinate, radius?: number): boolean {
        return (coord === undefined) || Geo.coordinatesAreNear(coord, this.coord, radius ?? DEFAULT_NEAR_RADIUS);
    }

    public isInRegion(region?: Geo.Region): boolean {
        return (region === undefined) || Geo.coordinateIsInRegion(this.coord, region);
    }

    public get keys(): PoiKeys {
        return this._keys;
    }

    public toString(): string {
        return this.primaryKey;
    }

    public toArray(): (string|number)[] {
        return [
            this.zones.join('|'),
            this.city,
            [this.name, ...this.alternateNames].join('|'),
            this.coord.latitude,
            this.coord.longitude,
        ];
    }

    public toJson(): JsonObject {
        return {
            zones: this.zones,
            city: this.city,
            name: this.name,
            alternateNames: this.alternateNames,
            coord: {
                latitude: this.coord.latitude,
                longitude: this.coord.longitude,
            },
        };
    }

    protected _normalize(): PoiKeys {
        return {
            name: Names.normalizeOrThrow(this._name),
            city: Names.normalizeOrThrow(this._city),
            zones: Names.normalizeOrThrow(this._zones),
            alternateNames: Names.normalizeOrThrow(this._alternateNames),
        };
    }
}
