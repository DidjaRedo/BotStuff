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
import * as PogoConverters from '../../../../src/pogo/converters/pogoConverters';
import { PokemonType, RaidTier, Weather } from '../../../../src/pogo/game';

describe('PogoConverters Module', () => {
    describe('pokemonType converter', () => {
        const pokemonTypes: PokemonType[] = [
            'bug', 'dark', 'dragon', 'electric', 'fairy', 'fighting',
            'fire', 'flying', 'ghost', 'grass', 'ground', 'ice',
            'normal', 'poison', 'psychic', 'rock', 'steel', 'water',
        ];
        test('converts valid pokemon types', () => {
            for (const type of pokemonTypes) {
                expect(PogoConverters.pokemonType.convert(type)).toSucceedWith(type);
            }
        });

        test('fails for invalid pokemon types', () => {
            [
                'BUGG', true, 11, () => 'bug', 'Dork',
            ].forEach((t) => {
                expect(PogoConverters.pokemonType.convert(t)).toFailWith(/invalid pokemon type/i);
            });
        });
    });

    describe('raidTier converter', () => {
        const tests: [(RaidTier|string), RaidTier][] = [
            [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6],
            ['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6],
            ['Tier 1', 1], ['Tier 2', 2], ['tier 3', 3],
            ['Tier 4', 4], ['TIER 5', 5], ['Tier 6', 6],
        ];
        test('converts valid raid tiers', () => {
            for (const t of tests) {
                expect(PogoConverters.raidTier.convert(t[0])).toSucceedWith(t[1]);
            }
        });

        test('fails for invalid raid tiers', () => {
            [
                true, 0, 7, 'zero', 'Tier 7', 'tier1',
            ].forEach((t) => {
                expect(PogoConverters.raidTier.convert(t)).toFailWith(/invalid raid tier/i);
            });
        });
    });

    describe('raidTierRange converter', () => {
        const tests: [string, RaidTier, RaidTier][] = [
            ['1', 1, 1],
            ['2', 2, 2],
            ['1-2', 1, 2],
            ['-4', 1, 4],
            ['2-', 2, 6],
            ['3+', 3, 6],
        ];
        test('converts valid raid ranges', () => {
            for (const t of tests) {
                expect(PogoConverters.raidTierRange.convert(t[0])).toSucceedWith(expect.objectContaining({
                    min: t[1], max: t[2],
                }));
            }
        });

        test('fails for invalid raid tier ranges', () => {
            [
                true, 0, 7, 'zero', 'Tier 7', 'tier1',
                '7+', '1-3-3', '5-1', '-7',
            ].forEach((t) => {
                expect(PogoConverters.raidTierRange.convert(t))
                    .toFailWith(/cannot convert.*to raid tier range/i);
            });
        });
    });

    describe('weather converter', () => {
        const tests: [(Weather|string), Weather][] = [
            ['clear', 'clear'], ['cloudy', 'cloudy'], ['fog', 'fog'],
            ['PartlyCloudy', 'partlycloudy'], ['rain', 'rain'],
            ['snow', 'snow'], ['wind', 'wind'],
            ['Clear', 'clear'], ['Sunny', 'clear'],
            ['Partly Cloudy', 'partlycloudy'],
            ['partly_cloudy', 'partlycloudy'],
        ];
        test('converts valid weather types', () => {
            for (const test of tests) {
                expect(PogoConverters.weather.convert(test[0])).toSucceedWith(test[1]);
            }
        });

        test('fails for invalid weather types', () => {
            [
                'BUG', true, 11, () => 'bug', 'Dark', 'Windy',
            ].forEach((t) => {
                expect(PogoConverters.weather.convert(t)).toFailWith(/invalid weather/i);
            });
        });
    });
});
