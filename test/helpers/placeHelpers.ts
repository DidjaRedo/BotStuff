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

import * as Geo from '../../src/utils/geo';
import * as PoiLookupOptions from '../../src/places/poiLookupOptions';
import { Poi, PoiProperties } from '../../src/places/poi';

export class TestPoiProperties implements PoiProperties {
    name: string;
    city: string;
    zones: string[];
    alternateNames?: string[];
    coord: Geo.Coordinate;
    expectedCategory?: PoiLookupOptions.PoiCategories<TestPoi>;
}

export class TestPoi extends Poi {
    public readonly expectedCategory?: PoiLookupOptions.PoiCategories<TestPoi>
    public constructor(init: TestPoiProperties) {
        super(init);
        this.expectedCategory = init.expectedCategory;
    }
}

export interface PoiTestDataInitializer<PP extends PoiProperties> {
    zones: string[];
    cities: string[];
    poiProperties: PP[];
}

export abstract class PoiTestDataBase<PP extends PoiProperties> implements PoiTestDataInitializer<PP> {
    public readonly zones: string[];
    public readonly cities: string[];
    public readonly poiProperties: PP[];

    public constructor(init: PoiTestDataInitializer<PP>) {
        this.zones = init.zones;
        this.cities = init.cities;
        this.poiProperties = init.poiProperties;
    }
}

export abstract class PoiGeneratorBase<P extends Poi, PP extends PoiProperties> {
    protected static readonly _zoneSpecs = [
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    ];

    protected static readonly _citySpecs = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
        'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    ];

    protected static _generateZoneNames(numZones: number): string[] {
        const names: string[] = [];
        if ((numZones < 0) || (numZones > PoiGeneratorBase._zoneSpecs.length)) {
            throw new Error(`numZones must be 0...${PoiGeneratorBase._zoneSpecs.length}`);
        }

        for (let n = 0; n < numZones; n++) {
            names.push(`Zone ${n}`);
        }
        return names;
    }

    protected static _generateCityNames(numCities: number): string[] {
        const names: string[] = [];
        if ((numCities < 0) || (numCities > PoiGeneratorBase._citySpecs.length)) {
            throw new Error(`numCities must be 0..${PoiGeneratorBase._citySpecs.length}`);
        }
        for (let n = 0; n < numCities; n++) {
            names.push(`City ${PoiGeneratorBase._citySpecs[n]}`);
        }
        return names;
    }

    protected static _parsePoiSpec(spec: string): { spec: string, city: number; zones: number[] } {
        const city = PoiGeneratorBase._citySpecs.indexOf(spec.substr(0, 1));
        if (city < 0) {
            throw new Error(`Unknown city specification ${spec.substr(0, 1)}`);
        }

        const poiSpec = spec.split('|')[0];
        const zones: number[] = [];
        for (let i = 1; i < poiSpec.length; i++) {
            const zone = PoiGeneratorBase._zoneSpecs.indexOf(poiSpec.substr(i, 1));
            if (zone < 0) {
                throw new Error(`Unknown zone specification ${poiSpec.substr(i, 1)}`);
            }
            zones.push(zone);
        }
        return { spec, city, zones };
    }

    protected static _parsePoiProperties(spec: string, zones: string[], cities: string[]): PoiProperties {
        const parsed = PoiGeneratorBase._parsePoiSpec(spec);
        const properties: PoiProperties = {
            name: `Poi ${spec}`,
            alternateNames: [spec],
            city: cities[parsed.city],
            zones: parsed.zones.map((n) => {
                const z = zones[n];
                if ((!z) || (z.length === 0)) {
                    throw new Error(`Invalid zone number ${n}`);
                }
                return z;
            }),
            coord: {
                latitude: 45,
                longitude: 122,
            },
        };

        if (!properties.city) {
            throw new Error(`Invalid city number ${parsed.city}`);
        }
        return properties;
    }

    public generateInitializer(specs: string[], zoneNames?: string[], cityNames?: string[]): PoiTestDataInitializer<PP> {
        const allZoneNames = zoneNames ?? PoiGeneratorBase._generateZoneNames(PoiGeneratorBase._zoneSpecs.length);
        const allCityNames = cityNames ?? PoiGeneratorBase._generateCityNames(PoiGeneratorBase._citySpecs.length);
        const gotPoiNames = new Set<string>();
        const gotZoneNames = new Set<string>();
        const gotCityNames = new Set<string>();

        const poiProperties: PP[] = specs.map((s) => {
            const props: PP = this.parseProperties(s, allZoneNames, allCityNames);
            gotCityNames.add(props.city);
            props.zones.forEach((n) => gotZoneNames.add(n));
            if (gotPoiNames.has(props.name)) {
                let counter = 1;
                let name = `${props.name} ${counter}`;
                while (gotPoiNames.has(name)) {
                    counter++;
                    name = `${props.name} ${counter}`;
                }
                props.name = name;
            }
            return props;
        });

        const zones = Array.from(gotZoneNames.keys());
        const cities = Array.from(gotCityNames.keys());
        return { zones, cities, poiProperties };
    }

    public abstract parseProperties(spec: string, zones?: string[], cities?: string[]): PP;
}

export class TestPoiData extends PoiTestDataBase<TestPoiProperties> {
    public getPois(): TestPoi[] {
        return this.poiProperties.map((p) => new TestPoi(p));
    }
}

export class TestPoiGenerator extends PoiGeneratorBase<TestPoi, TestPoiProperties> {
    protected static readonly _singleton = new TestPoiGenerator();

    public static generate(specs: string[], zoneNames?: string[], cityNames?: []): TestPoiData {
        return new TestPoiData(TestPoiGenerator._singleton.generateInitializer(specs, zoneNames, cityNames));
    }

    public parseProperties(spec: string, zoneNames?: string[], cityNames?: string[]): TestPoiProperties {
        return PoiGeneratorBase._parsePoiProperties(spec, zoneNames ?? [], cityNames ?? []);
    }
}
