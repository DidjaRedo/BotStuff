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

import '@fgv/ts-utils-jest';
import * as PoiLookupOptions from '../../../src/places/poiLookupOptions';
import { TestPoi, TestPoiGenerator } from '../../helpers/placeHelpers';
import { Names } from '../../../src/names/names';
import { SearchResult } from '../../../src/names/directory';

describe('PoiLookupOptions module', () => {
    describe('categorizePois function', () => {
        test('matches everything if no preferences or restrictions are present', () => {
            const testPois = TestPoiGenerator.generate([
                'A0', 'A1', 'B01', 'B1', 'C12',
            ]).getPois();

            const categorized = PoiLookupOptions.categorizePois(testPois, PoiLookupOptions.defaultProperties);
            expect(categorized.matched).toHaveLength(testPois.length);
        });

        test('ignores POIs that are not in required cities or zones, if present', () => {
            const testPois = TestPoiGenerator.generate([
                'A0', 'A1', 'B01', 'B1', 'C12',
            ]).getPois();

            let categorized = PoiLookupOptions.categorizePois(testPois, {
                ...PoiLookupOptions.defaultProperties,
                allowedCities: [
                    Names.normalizeOrThrow('City A'),
                    Names.normalizeOrThrow('City C'),
                ],
            });
            expect(categorized.matched).toHaveLength(3);
            expect(categorized.disallowed).toHaveLength(2);

            categorized = PoiLookupOptions.categorizePois(testPois, {
                ...PoiLookupOptions.defaultProperties,
                allowedZones: [
                    Names.normalizeOrThrow('zone1'),
                ],
            });
            expect(categorized.matched).toHaveLength(4);
            expect(categorized.disallowed).toHaveLength(1);
        });

        test('categorizes preferred cities and zones, if present', () => {
            const testPois = TestPoiGenerator.generate([
                'A0', 'A1', 'B01', 'B1', 'C12', 'B2',
            ]).getPois();

            const categorized = PoiLookupOptions.categorizePois(testPois, {
                ...PoiLookupOptions.defaultProperties,
                preferredCities: [Names.normalizeOrThrow('City A')],
                preferredZones: [Names.normalizeOrThrow('Zone 1')],
            });
            expect(categorized.matched).toHaveLength(1);
            expect(categorized.inPreferredZone).toHaveLength(3);
            expect(categorized.inPreferredCity).toHaveLength(1);
            expect(categorized.unmatched).toHaveLength(1);
        });

        test('applies the "near" filter if present', () => {
            const testData = TestPoiGenerator.generate(['A0', 'A0', 'A0']);
            testData.poiProperties[0].coord.longitude = 121;
            testData.poiProperties[1].coord.longitude = 121.01;
            testData.poiProperties[2].coord.longitude = 121.10;
            const testPois = testData.getPois();

            const categorized = PoiLookupOptions.categorizePois(testPois, {
                ...PoiLookupOptions.defaultProperties,
                near: testPois[1].coord,
            });
            expect(categorized.matched).toHaveLength(2);
            expect(categorized.filteredOut).toHaveLength(1);
        });

        test('applies the region filter if present', () => {
            const testData = TestPoiGenerator.generate(['A0', 'A0', 'A0', 'A0', 'A0']);
            testData.poiProperties[0].coord = {
                latitude: 42,
                longitude: 121,
            };
            testData.poiProperties[1].coord = {
                latitude: 42.5,
                longitude: 121.5,
            };
            testData.poiProperties[2].coord = {
                latitude: 43,
                longitude: 122,
            };
            testData.poiProperties[3].coord = {
                latitude: 43.5,
                longitude: 121.5,
            };
            testData.poiProperties[4].coord = {
                latitude: 42.5,
                longitude: 120,
            };
            const testPois = testData.getPois();

            const categorized = PoiLookupOptions.categorizePois(testPois, {
                ...PoiLookupOptions.defaultProperties,
                region: {
                    min: testPois[0].coord,
                    max: testPois[2].coord,
                },
            });
            expect(categorized.matched).toHaveLength(3);
            expect(categorized.filteredOut).toHaveLength(2);
        });

        test('applies a supplied filter if present', () => {
            const testData = TestPoiGenerator.generate(['A0', 'A0', 'A0']);
            testData.poiProperties[0].alternateNames = ['Alpha'];
            testData.poiProperties[1].alternateNames = ['Bravo'];
            testData.poiProperties[2].alternateNames = ['Charlie'];
            const testPois = testData.getPois();

            const categorized = PoiLookupOptions.categorizePois(
                testPois,
                PoiLookupOptions.defaultProperties,
                (p) => !p.alternateNames.includes('Bravo'),
            );
            expect(categorized.matched).toHaveLength(2);
            expect(categorized.filteredOut).toHaveLength(1);
        });
    });

    describe('adjustSearchResults function', () => {
        const testPois = TestPoiGenerator.generate([
            'A0', 'A1', 'B01', 'B1', 'C12',
        ]).getPois();
        const testLookups: SearchResult<TestPoi>[] = testPois.map(
            (p) => { return { item: p, score: 1.0 }; }
        );

        test('reports all lookups if there are no preferences', () => {
            const adjusted = PoiLookupOptions.adjustSearchResults(testLookups, PoiLookupOptions.defaultProperties);
            expect(adjusted).toHaveLength(testLookups.length);
        });

        test('reports only matched lookups if there are partial matches', () => {
            const adjusted = PoiLookupOptions.adjustSearchResults(
                testLookups,
                {
                    ...PoiLookupOptions.defaultProperties,
                    preferredCities: [Names.normalizeOrThrow('City A')],
                    preferredZones: [Names.normalizeOrThrow('Zone 1')],
                }
            );
            expect(adjusted).toHaveLength(1);
            adjusted.forEach((l) => expect(l.score).toBe(1));
        });

        test('reports only POIs from preferred cities if both cities and zones match', () => {
            const adjusted = PoiLookupOptions.adjustSearchResults(
                testLookups,
                {
                    ...PoiLookupOptions.defaultProperties,
                    preferredCities: [Names.normalizeOrThrow('City A')],
                    preferredZones: [Names.normalizeOrThrow('Zone 2')],
                }
            );
            expect(adjusted).toHaveLength(2);
            adjusted.forEach((l) => expect(l.score).toBe(0.9));
        });

        test('reports only POIs from preferred cities if there are no preferred zones', () => {
            const adjusted = PoiLookupOptions.adjustSearchResults(
                testLookups,
                {
                    ...PoiLookupOptions.defaultProperties,
                    preferredCities: [Names.normalizeOrThrow('City A')],
                }
            );
            expect(adjusted).toHaveLength(2);
            adjusted.forEach((l) => expect(l.score).toBe(1.0));
        });

        test('reports only POIs from preferred zones if no preferred cities match', () => {
            const adjusted = PoiLookupOptions.adjustSearchResults(
                testLookups,
                {
                    ...PoiLookupOptions.defaultProperties,
                    preferredCities: [Names.normalizeOrThrow('City D')],
                    preferredZones: [Names.normalizeOrThrow('Zone 2')],
                }
            );
            expect(adjusted).toHaveLength(1);
            adjusted.forEach((l) => expect(l.score).toBe(0.8));
        });

        test('reports only POIs from preferred zones if there are no preferred cities', () => {
            const adjusted = PoiLookupOptions.adjustSearchResults(
                testLookups,
                {
                    ...PoiLookupOptions.defaultProperties,
                    preferredZones: [Names.normalizeOrThrow('Zone 2')],
                }
            );
            expect(adjusted).toHaveLength(1);
            adjusted.forEach((l) => expect(l.score).toBe(1.0));
        });

        test('Reports all non-filtered POIs if no preferred cities or zones match', () => {
            const adjusted = PoiLookupOptions.adjustSearchResults(
                testLookups,
                {
                    ...PoiLookupOptions.defaultProperties,
                    preferredCities: [Names.normalizeOrThrow('City D')],
                    preferredZones: [Names.normalizeOrThrow('Zone 7')],
                }
            );
            expect(adjusted).toHaveLength(5);
            adjusted.forEach((l) => expect(l.score).toBe(0.7));
        });

        test('reports an empty list if no POIs are in allowed cities or zones', () => {
            const adjusted = PoiLookupOptions.adjustSearchResults(
                testLookups,
                {
                    ...PoiLookupOptions.defaultProperties,
                    allowedCities: [Names.normalizeOrThrow('City C')],
                    allowedZones: [Names.normalizeOrThrow('Zone 0')],
                }
            );
            expect(adjusted).toHaveLength(0);
        });
    });

    describe('Properties merger', () => {
        describe('mergeInPlace merger', () => {
            test('merges into an existing object', () => {
                const baseProps: PoiLookupOptions.Properties = {
                    ...PoiLookupOptions.defaultProperties,
                    allowedCities: ['paris', 'london', 'seattle'],
                };
                const mergeProps: Partial<PoiLookupOptions.Properties> = {
                    radius: 99999,
                    allowedCities: ['New York City'],
                };
                const expected: PoiLookupOptions.Properties = {
                    ...baseProps,
                    allowedCities: ['newyorkcity'],
                    radius: 99999,
                };

                expect(PoiLookupOptions.merger.mergeInPlace(baseProps, mergeProps))
                    .toSucceedAndSatisfy((got: PoiLookupOptions.Properties) => {
                        expect(got).toEqual(expected);
                        expect(got).toBe(baseProps);
                    });
            });
        });

        describe('mergeIntoCopy merger', () => {
            test('merges into a new object', () => {
                const baseProps: PoiLookupOptions.Properties = {
                    ...PoiLookupOptions.defaultProperties,
                    allowedCities: ['paris', 'london', 'seattle'],
                };
                const mergeProps: Partial<PoiLookupOptions.Properties> = {
                    radius: 99999,
                    allowedCities: ['New York City'],
                };
                const expected: PoiLookupOptions.Properties = {
                    ...baseProps,
                    allowedCities: ['newyorkcity'],
                    radius: 99999,
                };

                expect(PoiLookupOptions.merger.mergeIntoCopy(baseProps, mergeProps))
                    .toSucceedAndSatisfy((got: PoiLookupOptions.Properties) => {
                        expect(got).toEqual(expected);
                        expect(got).not.toBe(baseProps);
                        expect(baseProps).not.toEqual(expected);
                    });
            });

            test('merges into the default options if base is undefined', () => {
                const mergeProps: Partial<PoiLookupOptions.Properties> = {
                    allowedCities: ['New York City'],
                };
                const expected: PoiLookupOptions.Properties = {
                    ...PoiLookupOptions.defaultProperties,
                    allowedCities: ['newyorkcity'],
                };

                expect(PoiLookupOptions.merger.mergeIntoCopy(undefined, mergeProps))
                    .toSucceedAndSatisfy((got: PoiLookupOptions.Properties) => {
                        expect(got).toEqual(expected);
                    });
            });
        });
    });
});
