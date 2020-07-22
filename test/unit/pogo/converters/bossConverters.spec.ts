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

import '../../../helpers/jestHelpers';
import { Boss, BossProperties } from '../../../../src/pogo/boss';
import {
    bossPropertiesFromArray,
    bossPropertiesFromLegacyArray,
} from '../../../../src/pogo/converters/bossConverters';

describe('Pogo BossConverters module', () => {
    describe('bossPropertiesFromLegacyArray converter', () => {
        it('should convert valid bosses from legacy format', () => {
            const tests: { src: (string|number)[], expected: BossProperties}[] = [
                {
                    src: ['Terrakion', '639', 'Tier 5', 't5.png', 'inactive'],
                    expected: {
                        name: 'Terrakion',
                        pokedexNumber: 639,
                        tier: 5,
                        active: false,
                    },
                },
                {
                    src: ['Reshiram', '643', 5, 't5.png', 'active'],
                    expected: {
                        name: 'Reshiram',
                        pokedexNumber: 643,
                        tier: 5,
                        active: true,
                    },
                },
            ];

            for (const test of tests) {
                const result = bossPropertiesFromLegacyArray.convert(test.src);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toMatchObject(test.expected);
                }
            }
        });

        it('should fail for an invalid input', () => {
            const tests = [
                {
                    src: ['Terrakion', '639', 'Tier 5', 't5.png', 'inactive', 'with', 'extra', 'columns'],
                    expected: /five columns/i,
                },
                {
                    src: 'Terrakion, 639, Tier 5, t5.png, inactive',
                    expected: /five columns/i,
                },
            ];

            for (const test of tests) {
                const result = bossPropertiesFromLegacyArray.convert(test.src);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(test.expected);
                }
            }
        });
    });

    describe('bossPropertiesFromArray converter', () => {
        it('should convert a boss from a valid array', () => {
            const tests: { src: (string|number)[], expected: BossProperties}[] = [
                {
                    src: [5, 'Armored Mewtwo|Mewtwo', 150, 3, 1740, 1821, 2175, 2276],
                    expected: {
                        name: 'Armored Mewtwo',
                        alternateNames: ['Mewtwo'],
                        pokedexNumber: 150,
                        numRaiders: 3,
                        tier: 5,
                        cpRange: { min: 1740, max: 1821 },
                        boostedCpRange: { min: 2175, max: 2276 },
                    },
                },
                {
                    src: [5, 'Armored Mewtwo|*Mewtwo', 150, 3, 1740, 1821, 2175, 2276],
                    expected: {
                        name: 'Armored Mewtwo',
                        displayName: 'Mewtwo',
                        alternateNames: ['Mewtwo'],
                        pokedexNumber: 150,
                        numRaiders: 3,
                        tier: 5,
                        cpRange: { min: 1740, max: 1821 },
                        boostedCpRange: { min: 2175, max: 2276 },
                    },
                },
                {
                    src: [5, 'Reshiram', 643, 2, 2217, 2307, 2772, 2884],
                    expected: {
                        name: 'Reshiram',
                        pokedexNumber: 643,
                        tier: 5,
                        cpRange: { min: 2217, max: 2307 },
                        boostedCpRange: { min: 2772, max: 2884 },
                    },
                },
                {
                    src: [5, 'Reshiram', 643, 2, 2217, 2307, 2772, 2884, 'dragon|fire'],
                    expected: {
                        name: 'Reshiram',
                        pokedexNumber: 643,
                        tier: 5,
                        cpRange: { min: 2217, max: 2307 },
                        boostedCpRange: { min: 2772, max: 2884 },
                        types: ['dragon', 'fire'],
                    },
                },
            ];

            for (const test of tests) {
                const result = bossPropertiesFromArray.convert(test.src);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toMatchObject(test.expected);
                }
            }
        });

        it('should fail for an invalid input', () => {
            const tests = [
                {
                    src: [5, '  |Armored Mewtwo|*Mewtwo', 150, 3, 1740, 1821, 2175, 2276],
                    expected: /invalid name/i,
                },
                {
                    src: ['Terrakion', '639', 'Tier 5', 't5.png', 'inactive'],
                    expected: /boss array must have/i,
                },
                {
                    src: 'Tier 5, Terrakion, 639, t5.png, inactive, 1000, 1000, 1000',
                    expected: /boss array must have/i,
                },
                {
                    src: ['Tier 5', 'Terrakion', 639, 't5.png', 'inactive', 1000, 1000, 1000],
                    expected: /not a number/i,
                },
                {
                    src: [5, 10, 639, 'test', 1000, 1000, 1000, 1000],
                    expected: /invalid names specifier/i,
                },
                {
                    src: [5, 'Armored Mewtwo|*Mewtwo|*Twomew', 150, 3, 1740, 1821, 2175, 2276],
                    expected: /display name multiply defined/i,
                },
            ];

            for (const test of tests) {
                expect(bossPropertiesFromArray.convert(test.src)).toFailWith(test.expected);
            }
        });
    });

    describe('getDirectoryOptions static method', (): void => {
        it('should search by name and alternate name and index by alternate names', (): void => {
            expect(Boss.getDirectoryOptions()).toMatchObject({
                textSearchKeys: [
                    { name: 'displayName' },
                    { name: 'name' },
                    { name: 'alternateNames' },
                ],
                alternateKeys: ['name', 'alternateNames'],
            });
        });
    });
});
