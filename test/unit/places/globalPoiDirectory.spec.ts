import * as PoiLookupOptions from '../../../src/places/poiLookupOptions';
import { GlobalPoiDirectory } from '../../../src/places/globalPoiDirectory';
import { Poi } from '../../../src/places/poi';
import { generateTestPoiData } from '../../helpers/placeHelpers';
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
describe('GlobalPoiDirectory class', () => {
    describe('constructor', () => {
        it('should construct with default options', () => {
            const dir = new GlobalPoiDirectory<Poi>();
            expect(dir.options).toEqual(PoiLookupOptions.Default);
            expect(dir.pois.size).toBe(0);
            expect(dir.zones.size).toBe(0);
            expect(dir.cities.size).toBe(0);
        });

        it('should construct with supplied options', () => {
            const dir = new GlobalPoiDirectory<Poi>({ allowedZones: ['Zone 1'] });
            expect(dir.options).toEqual({
                ...PoiLookupOptions.Default,
                allowedZones: ['zone1'],
            });
        });

        it('should construct with supplied POIs creating zones and cities as necssary', () => {
            const testData = generateTestPoiData([
                'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
            ]);
            const testPois = testData.getPois();

            const dir = new GlobalPoiDirectory<Poi>(undefined, testPois);
            expect(dir.pois.size).toEqual(testData.poiProperties.length);
            expect(dir.zones.size).toEqual(testData.zones.length);
            expect(dir.cities.size).toEqual(testData.cities.length);
        });

        it('should ignore disallowed cities by default', () => {
            const testData = generateTestPoiData([
                'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
            ]);
            const testPois = testData.getPois();

            const dir = new GlobalPoiDirectory<Poi>({
                ...PoiLookupOptions.Default,
                allowedCities: ['City B'],
            }, testPois);

            expect(dir.pois.size).toEqual(2); // B01 and B1
            expect(dir.cities.size).toEqual(1); // City B
            expect(dir.zones.size).toEqual(2); // Zone 0 and Zone 1
        });

        it('should ignore disallowed zones by default', () => {
            const testData = generateTestPoiData([
                'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
            ]);
            const testPois = testData.getPois();

            const dir = new GlobalPoiDirectory<Poi>({
                ...PoiLookupOptions.Default,
                allowedZones: ['Zone 0', 'Zone 1'],
            }, testPois);

            expect(dir.pois.size).toEqual(testData.poiProperties.length - 1); // D2 omitted
            expect(dir.cities.size).toEqual(testData.cities.length - 1); // City D omitted
            expect(dir.zones.size).toEqual(2); // only the allowed zones
        });

        it('should throw for disallowed cities or zones if specified', () => {
            const testData = generateTestPoiData([
                'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
            ]);
            const testPois = testData.getPois();

            expect(() => {
                const __ = new GlobalPoiDirectory({ // eslint-disable-line
                    ...PoiLookupOptions.Default,
                    onNonAllowedCities: 'error',
                    allowedCities: ['City A', 'City B', 'City D'],
                }, testPois);
            }).toThrowError(/not.*allowed city/i);

            expect(() => {
                const __ = new GlobalPoiDirectory({ // eslint-disable-line
                    ...PoiLookupOptions.Default,
                    onNonAllowedZones: 'error',
                    allowedZones: ['Zone 0', 'Zone 2'],
                }, testPois);
            }).toThrowError(/not.*allowed zone/i);
        });
    });

    describe('tryGetPoisExact method', () => {
        const testData = generateTestPoiData([
            'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
        ]);
        testData.poiProperties[0].alternateNames = ['First POI'];
        testData.poiProperties[4].alternateNames = ['Allowed Duplicate'];
        testData.poiProperties[5].alternateNames = ['Allowed Duplicate'];
        const testPois = testData.getPois();

        const dir = new GlobalPoiDirectory(undefined, testPois);

        it('should correctly look up pois by an exact normalized match on name or alternate name', () => {
            [
                'firstpoi',
                'POI A0',
                'poi   c12',
            ].forEach((name) => {
                expect(dir.tryGetPoisExact(name)).toHaveLength(1);
            });

            expect(dir.tryGetPoisExact('allowed DUPLICATE')).toHaveLength(2);
        });

        it('should return no result for non-matching pois', () => {
            [
                'FirstPois',
                'c12 poi',
            ].forEach((name) => {
                expect(dir.tryGetPoisExact(name)).toHaveLength(0);
            });
        });
    });

    describe('tryGetPoisFuzzy method', () => {
        const testData = generateTestPoiData([
            'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
        ]);
        testData.poiProperties[0].alternateNames = ['First POI'];
        testData.poiProperties[4].alternateNames = ['Point the First', 'duplicate'];
        testData.poiProperties[5].alternateNames = ['Point the Second', 'duplicate'];
        const testPois = testData.getPois();

        const dir = new GlobalPoiDirectory(undefined, testPois);

        it('should correctly look up pois by fuzzy match on name or alternate name', () => {
            [
                'first',
                'poi d',
            ].forEach((name) => {
                expect(dir.tryGetPoisFuzzy(name)).toHaveLength(1);
            });

            expect(dir.tryGetPoisFuzzy('Point the')).toHaveLength(2);
        });

        it('should return no result for non-matching pois', () => {
            [
                'FirstPois',
                'c12 poi',
            ].forEach((name) => {
                expect(dir.tryGetPoisFuzzy(name)).toHaveLength(0);
            });
        });
    });

    describe('tryGetPois method', () => {
        const testData = generateTestPoiData([
            'A0', 'A1', 'B01', 'B1', 'C12', 'D2',
        ]);
        testData.poiProperties[0].alternateNames = ['First POI'];
        testData.poiProperties[4].alternateNames = ['Point the First', 'duplicate'];
        testData.poiProperties[5].alternateNames = ['Point the Second', 'duplicate'];
        const testPois = testData.getPois();

        describe('with noFuzzyLookup', () =>{
            const dir = new GlobalPoiDirectory({ noFuzzyLookup: true }, testPois);

            it('should correctly look up pois by an exact normalized match on name or alternate name', () => {
                [
                    'firstpoi',
                    'POI A0',
                    'poi   c12',
                ].forEach((name) => {
                    expect(dir.tryGetPois(name)).toHaveLength(1);
                });

                expect(dir.tryGetPoisExact('DUPLICATE')).toHaveLength(2);
            });

            it('should return no result for non-matching pois', () => {
                [
                    'point the',
                    'first',
                ].forEach((name) => {
                    expect(dir.tryGetPoisExact(name)).toHaveLength(0);
                });
            });
        });

        describe('with noExactLookup', () => {
            const dir = new GlobalPoiDirectory({ noExactLookup: true }, testPois);
            it('should correctly look up pois by fuzzy match on name or alternate name', () => {
                [
                    'first',
                    'poi d',
                ].forEach((name) => {
                    expect(dir.tryGetPois(name)).toHaveLength(1);
                });

                expect(dir.tryGetPoisFuzzy('Point the')).toHaveLength(2);
            });

            it('should return no result for non-matching pois', () => {
                [
                    'firstpoi',
                    'poi   c12',
                ].forEach((name) => {
                    expect(dir.tryGetPois(name)).toHaveLength(0);
                });
            });
        });
    });
});
