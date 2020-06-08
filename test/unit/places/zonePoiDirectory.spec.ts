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
import { Poi, PoiProperties } from '../../../src/places/poi';
import { ZonePoiDirectory, ZonePoiLookupOptions, defaultZonePoiDirectoryOptions } from '../../../src/places/zonePoiDirectory';
import { Names } from '../../../src/names/names';

describe('ZonePoiDirectory class', (): void => {
    const poisInit: PoiProperties[] = [
        {
            name: 'Farmers Market',
            alternateNames: ['Ruby Town Center Farmers Market'],
            city: 'Ruby',
            zones: ['Red Zone'],
            coord: {
                latitude: 47.1,
                longitude: -122.2,
            },
        },
        {
            name: 'Bigbux (Ruby Town Center)',
            alternateNames: ['Ruby Town Center Bigbux'],
            city: 'Ruby',
            zones: ['Red Zone'],
            coord: {
                latitude: 47.2,
                longitude: -122.2,
            },
        },
        {
            name: 'Blue-Red Bank',
            city: 'Bluby',
            zones: ['Red zone', 'blue zone'],
            coord: {
                latitude: 47.3,
                longitude: -122.3,
            },
        },
        {
            name: 'Bigbux (Blue-Red Center)',
            city: 'Bluby',
            alternateNames: ['Blue-Red Center Bigbux'],
            zones: ['Red zone', 'blue zone'],
            coord: {
                latitude: 47.4,
                longitude: -122.4,
            },
        },
        {
            name: 'Bigbux (Bluevue Downtown)',
            alternateNames: ['Bluevue Downtown Bigbux'],
            city: 'Bluevue',
            zones: ['Blue Zone'],
            coord: {
                latitude: 48.1,
                longitude: -121.1,
            },
        },
        {
            name: 'Bigbux (Emerald City Downtown)',
            alternateNames: ['Downtown Emereald Bigbux'],
            city: 'Emerald',
            zones: ['Green Zone'],
            coord: {
                latitude: 49.1,
                longitude: -120.1,
            },
        },
    ];
    const pois = poisInit.map((i) => new Poi(i));
    const redPois = pois.filter((p) => p.keys.zones.includes('redzone'));
    const greenPois = pois.filter((p) => p.keys.zones.includes('greenzone'));
    const redBluePois = pois.filter((p) => p.keys.zones.includes('redzone') && p.keys.zones.includes('bluezone'));

    describe('constructor', (): void => {
        it('should construct a default zone with just a name', () => {
            expect.assertions(4);
            const zoneName = 'Twilight Zone';
            const zone = new ZonePoiDirectory(zoneName);
            expect(zone.name).toEqual(zoneName);
            expect(zone.primaryKey).toEqual(Names.normalizeOrThrow(zoneName));
            expect(zone.keys.name).toEqual(Names.normalizeOrThrow(zoneName));
            expect(zone.options).toEqual(defaultZonePoiDirectoryOptions);
        });

        it('should construct a zone with options', () => {
            expect.assertions(5);
            const zoneName = 'Red Zone';
            const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: true });
            expect(zone.name).toEqual(zoneName);
            expect(zone.primaryKey).toEqual(Names.normalizeOrThrow(zoneName));
            expect(zone.keys.name).toEqual(Names.normalizeOrThrow(zoneName));
            expect(zone.options).toBeDefined();
            expect(zone.options.failForUnknownZones).toBe(true);
        });

        describe('with failForUnknownZones false', () => {
            it('should construct a zone with options and POIs, ignoring unknown zones', () => {
                expect.assertions(4);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: false }, pois);
                expect(zone.name).toEqual(zoneName);
                expect(zone.primaryKey).toEqual(Names.normalizeOrThrow(zoneName));
                expect(zone.keys.name).toEqual(Names.normalizeOrThrow(zoneName));
                expect(zone.numPois).toEqual(redPois.length);
            });
        });

        describe('with failForUnknownZones true', () => {
            it('should construct a zone with options and pois if all POIs are from this zone', () => {
                expect.assertions(4);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: true }, redPois);
                expect(zone.name).toEqual(zoneName);
                expect(zone.primaryKey).toEqual(Names.normalizeOrThrow(zoneName));
                expect(zone.keys.name).toEqual(Names.normalizeOrThrow(zoneName));
                expect(zone.numPois).toEqual(redPois.length);
            });

            it('should throw if any supplied POIs are from another zone', () => {
                expect.assertions(2);
                const zoneName = 'Red Zone';
                let zone: ZonePoiDirectory|undefined;
                expect(() => {
                    zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: true }, pois);
                }).toThrowError(/does not belong to zone/i);
                expect(zone).toBeUndefined();
            });
        });
    });

    describe('addPois method', () => {
        describe('with failForUnknownZones false', () => {
            it('should add POIS for this zone while ignoring unknown zones', () => {
                expect.assertions(2);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: false });
                expect(() => zone.addPois(pois)).not.toThrow();
                expect(zone.numPois).toEqual(redPois.length);
            });

            it('should silently return if no POIs match the zone', () => {
                const zoneName = 'Purple Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: false });
                expect(() => zone.addPois(pois)).not.toThrow();
                expect(zone.numPois).toEqual(0);
            });
        });

        describe('with failForUnknownZones true', () => {
            it('should add POIs if they are all from this zone', () => {
                expect.assertions(2);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: true });
                expect(() => zone.addPois(redPois)).not.toThrow();
                expect(zone.numPois).toEqual(redPois.length);
            });

            it('should throw if any supplied POIs are from another zone', () => {
                expect.assertions(2);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: true });
                expect(() => zone.addPois(pois)).toThrowError(/does not belong to zone/i);
                expect(zone.numPois).toEqual(0);
            });
        });

        it('should silently return if no POIs are supplied', () => {
            expect.assertions(2);
            const zoneName = 'Red Zone';
            const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: true });
            expect(() => zone.addPois(undefined as Iterable<Poi>)).not.toThrow();
            expect(zone.numPois).toEqual(0);
        });

        describe('with supplied options', () => {
            it('should override failForUnknownZones to true', () => {
                expect.assertions(1);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: false });
                expect(() => {
                    zone.addPois(pois, { failForUnknownZones: true });
                }).toThrowError(/does not belong to zone/i);
            });

            it('should override failForUnknownZones to false', () => {
                expect.assertions(1);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: true });
                expect(() => {
                    zone.addPois(pois, { failForUnknownZones: false });
                }).not.toThrow();
            });
        });
    });

    describe('addPoi method', () => {
        describe('with failForUnknownZones false', () => {
            it('should add POIS for this zone while ignoring unknown zones', () => {
                expect.assertions(4);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: false });
                expect(() => zone.addPoi(redPois[0])).not.toThrow();
                expect(() => zone.addPoi(redBluePois[0])).not.toThrow();
                expect(() => zone.addPoi(greenPois[0])).not.toThrow();
                expect(zone.numPois).toEqual(2);
            });

            it('should silently return if no POIs match the zone', () => {
                const zoneName = 'Purple Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: false });
                expect(() => zone.addPoi(pois[0])).not.toThrow();
                expect(zone.numPois).toEqual(0);
            });
        });

        describe('with failForUnknownZones true', () => {
            it('should add POIs if they are from this zone', () => {
                expect.assertions(3);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: true });
                expect(() => zone.addPoi(redPois[0])).not.toThrow();
                expect(() => zone.addPoi(redBluePois[0])).not.toThrow();
                expect(zone.numPois).toEqual(2);
            });

            it('should throw if the POI does not include this zone', () => {
                expect.assertions(2);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: true });
                expect(() => zone.addPoi(greenPois[0])).toThrowError(/does not belong to zone/i);
                expect(zone.numPois).toEqual(0);
            });
        });

        describe('with supplied options', () => {
            it('should override failForUnknownZones to true', () => {
                expect.assertions(1);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: false });
                expect(() => {
                    zone.addPoi(greenPois[0], { failForUnknownZones: true });
                }).toThrowError(/does not belong to zone/i);
            });

            it('should override failForUnknownZones to false', () => {
                expect.assertions(1);
                const zoneName = 'Red Zone';
                const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: true });
                expect(() => {
                    zone.addPoi(greenPois[0], { failForUnknownZones: false });
                }).not.toThrow();
            });
        });
    });

    describe('tryGetPoisExact method', () => {
        const zoneName = 'Red Zone';
        const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: false }, pois);

        it('should get elements with a normalized exact match on any indexed field', () => {
            const tests = [
                'Farmers Market',
                'farmersmar ket',
                'ruby town center bigBUX',
            ];

            for (const t of tests) {
                expect(zone.tryGetPoisExact(t)).toHaveLength(1);
            }
        });

        it('should not get elements that are not a normalized exact match on some indexed field', () => {
            const tests = [
                'ruby',
                'Red Zone',
                'Farmers mark',
                'Bigbux',
            ];

            for (const t of tests) {
                expect(zone.tryGetPoisExact(t)).toHaveLength(0);
            }
        });
    });

    describe('tryGetPoisFuzzy', () => {
        const zoneName = 'Red Zone';
        const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: false }, pois);

        it('should get elements with a fuzzy match on any searchable text field', () => {
            const tests = [
                { text: 'bigbux', expect: 2 },
                { text: 'farmers', expect: 1 },
            ];

            for (const t of tests) {
                expect(zone.tryGetPoisFuzzy(t.text)).toHaveLength(t.expect);
            }
        });

        it('should not get elements that are not a normalized exact match on some indexed field', () => {
            const tests = [
                { text: 'blank', expect: 0 },
                { text: 'xyzzy', expect: 0 },
            ];

            for (const t of tests) {
                expect(zone.tryGetPoisFuzzy(t.text)).toHaveLength(t.expect);
            }
        });
    });

    describe('tryGetPois', () => {
        const zoneName = 'Red Zone';
        const zone = new ZonePoiDirectory(zoneName, { failForUnknownZones: false }, pois);

        it('it should get exact normalized matches', () => {
            const tests = [
                'Farmers Market',
                'farmersmar ket',
                'ruby town center bigBUX',
            ];

            for (const t of tests) {
                expect(zone.tryGetPois(t)).toHaveLength(1);
            }
        });

        it('should respect the noExactLookup option', () => {
            expect(zone.tryGetPois('fa rmersmar ket', { noExactLookup: true })).toHaveLength(0);
        });

        it('should get elements with a fuzzy match on any searchable text field', () => {
            const tests = [
                { text: 'bigbux', expect: 2 },
                { text: 'farmers', expect: 1 },
            ];

            for (const t of tests) {
                expect(zone.tryGetPois(t.text)).toHaveLength(t.expect);
            }
        });

        describe('with preferred cities', () => {
            it('should return only POIs from preferred cities if any are found', () => {
                const tests = [
                    { text: 'bigbux', expect: 1 },
                    { text: 'farmers', expect: 1 },
                ];

                for (const t of tests) {
                    const options: ZonePoiLookupOptions = { cities: ['ruby'] };
                    const poiResults = zone.tryGetPois(t.text, options);
                    expect(poiResults).toHaveLength(t.expect);
                    for (const r of poiResults) {
                        expect(options.cities).toContain(r.item.keys.city);
                    }
                }
            });

            it('should return all POIs if none are found in matching cities', () => {
                const tests = [
                    { text: 'bigbux', expect: 2 },
                    { text: 'farmers', expect: 1 },
                ];

                for (const t of tests) {
                    expect(zone.tryGetPois(t.text, { cities: ['emerald'] })).toHaveLength(t.expect);
                }
            });
        });
    });
});
