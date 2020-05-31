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
import { Result, captureResult } from '../utils/result';
import { KeyedThing } from '../names/keyedThing';
import { Names } from '../names/names';
import { NormalizedSet } from '../names/normalizedSet';

export interface ZoneKeys {
    readonly name: string;
}

export interface ZoneProperties extends ZoneKeys {
    readonly name: string;
}

export class Zone implements ZoneProperties, KeyedThing<ZoneKeys> {
    public readonly name: string;
    public readonly keys: ZoneKeys;
    public readonly cities = new NormalizedSet();
    public readonly pois = new NormalizedSet();

    public constructor(name: string) {
        Names.throwOnInvalidName(name, 'Zone name');

        this.name = name;
        this.keys = {
            name: Names.normalizeOrThrow(name),
        };
    }

    public get primaryKey(): string {
        return this.keys.name;
    }

    public includesCity(cityName: string): boolean {
        return this.cities.has(cityName);
    }

    public includesPoi(poiName: string): boolean {
        return this.pois.has(poiName);
    }

    public static create(name: string): Result<Zone> {
        return captureResult(() => new Zone(name));
    }
}
