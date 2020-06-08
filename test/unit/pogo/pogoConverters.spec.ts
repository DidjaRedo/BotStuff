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

import * as PogoConverters from '../../../src/pogo/pogoConverters';
import { PokemonType, RaidTier, Weather } from '../../../src/pogo/pogo';

describe('PogoConverters Module', () => {
    describe('pokemonType converter', () => {
        const pokemonTypes: PokemonType[] = [
            'bug', 'dark', 'dragon', 'electric', 'fairy', 'fighting',
            'fire', 'flying', 'ghost', 'grass', 'ground', 'ice',
            'normal', 'poison', 'psychic', 'rock', 'steel', 'water',
        ];
        it('should convert valid pokemon types', () => {
            for (const type of pokemonTypes) {
                const result = PogoConverters.pokemonType.convert(type);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toBe(type);
                }
            }
        });

        it('should fail for invalid pokemon types', () => {
            [
                'BUGG', true, 11, () => 'bug', 'Dork',
            ].forEach((t) => {
                const result = PogoConverters.pokemonType.convert(t);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/invalid pokemon type/i);
                }
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
        it('should convert valid raid tiers', () => {
            for (const t of tests) {
                const result = PogoConverters.raidTier.convert(t[0]);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toBe(t[1]);
                }
            }
        });

        it('should fail for invalid raid tiers', () => {
            [
                true, 0, 7, 'zero', 'Tier 7', 'tier1',
            ].forEach((t) => {
                const result = PogoConverters.raidTier.convert(t);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/invalid raid tier/i);
                }
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
        it('should convert valid weather types', () => {
            for (const test of tests) {
                const result = PogoConverters.weather.convert(test[0]);
                expect(result.isSuccess()).toBe(true);
                if (result.isSuccess()) {
                    expect(result.value).toBe(test[1]);
                }
            }
        });

        it('should fail for invalid weather types', () => {
            [
                'BUG', true, 11, () => 'bug', 'Dark', 'Windy',
            ].forEach((t) => {
                const result = PogoConverters.weather.convert(t);
                expect(result.isFailure()).toBe(true);
                if (result.isFailure()) {
                    expect(result.message).toMatch(/invalid weather/i);
                }
            });
        });
    });
});
