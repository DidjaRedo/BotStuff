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

import { Result, fail, succeed } from '../utils/result';

export type RaidTier = 1|2|3|4|5|6;

export const MIN_RAID_TIER = 1;
export const MAX_RAID_TIER = 6;

export function isValidRaidTier(num: number): num is RaidTier {
    if ((num >= MIN_RAID_TIER) && (num <= MAX_RAID_TIER)) {
        return true;
    }
    return false;
}

export function validateRaidTier(value?: unknown): Result<RaidTier> {
    if (typeof value === 'number') {
        if (isValidRaidTier(value)) {
            return succeed(value);
        }
    }
    else if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        const tiers: RaidTier[] = [1, 2, 3, 4, 5, 6];
        for (const tier of tiers) {
            if ([`${tier}`, `tier ${tier}`, `t${tier}`, `l${tier}`].includes(normalized)) {
                return succeed(tier);
            }
        }
    }
    return fail(`Invalid raid tier ${JSON.stringify(value)} must be ${MIN_RAID_TIER}...${MAX_RAID_TIER}`);
}

export type PokemonType = 'bug'|'dark'|'dragon'|'electric'|'fairy'|'fighting'
                        |'fire'|'flying'|'ghost'|'grass'|'ground'|'ice'
                        |'normal'|'poison'|'psychic'|'rock'|'steel'|'water';

export function validatePokemonType(value: unknown): Result<PokemonType> {
    if (typeof value === 'string') {
        const stringValue = value.trim().toLowerCase();
        switch (stringValue) {
            case 'bug': case 'dark': case 'dragon':
            case 'electric': case 'fairy': case 'fighting':
            case 'fire': case 'flying': case 'ghost':
            case 'grass': case 'ground': case 'ice':
            case 'normal': case 'poison': case 'psychic':
            case 'rock': case 'steel': case 'water':
                return succeed(stringValue);
        }
    }
    return fail(`Invalid pokemon type ${JSON.stringify(value)}`);
}

export type Weather = 'clear'|'cloudy'|'fog'|'partlycloudy'|'rain'|'snow'|'wind';

export function validateWeather(value: unknown): Result<Weather> {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        switch (normalized) {
            case 'clear': case 'cloudy': case 'fog': case 'partlycloudy':
            case 'rain': case 'snow': case 'wind':
                return succeed(normalized);
            case 'sunny':
                return succeed('clear');
            case 'partly_cloudy':
            case 'partly cloudy':
                return succeed('partlycloudy');
        }
    }
    return fail(`Invalid weather ${JSON.stringify(value)}`);
}

export const weatherBoosts: Record<Weather, Array<PokemonType>> = {
    clear: ['grass', 'ground', 'fire'],
    cloudy: ['fairy', 'fighting', 'poison'],
    fog: ['dark', 'ghost'],
    partlycloudy: ['normal', 'rock'],
    rain: ['water', 'electric', 'bug'],
    snow: ['ice', 'steel'],
    wind: ['dragon', 'flying', 'psychic'],
};

export const typeBoosts: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
    bug: {
        fighting: 0.5, flying: 0.5, poison: 0.5, ghost: 0.5, steel: 0.5,
        fire: 0.5, grass: 2, psychic: 2, dark: 2, fairy: 0.5,
    },
    dark: {
        fighting: 0.5, ghost: 2, psychic: 2, dark: 0.5, fairy: 0.5,
    },
    dragon: {
        steel: 0.5, dragon: 2, fairy: 0,
    },
    electric: {
        flying: 2, ground: 0, water: 2, grass: 0.5, electric: 0.5,
        dragon: 0.5,
    },
    fairy: {
        fighting: 2, poison: 0.5, steel: 0.5, fire: 0.5, dragon: 2,
        dark: 2,
    },
    fighting: {
        normal: 2, flying: 0.5, poison: 0.5, rock: 2, bug: 0.5,
        ghost: 0, steel: 2, psychic: 0.5, ice: 2, dark: 2,
        fairy: 0.5,
    },
    fire: {
        rock: 0.5, bug: 2, steel: 2, fire: 0.5, water: 0.5,
        grass: 2, ice: 2, dragon: 0.5,
    },
    flying: {
        fighting: 2, rock: 0.5, bug: 2, steel: 0.5, grass: 2,
        electric: 0.5,
    },
    ghost: {
        normal: 0, ghost: 2, psychic: 2, dark: 0.5,
    },
    grass: {
        flying: 0.5, poison: 0.5, ground: 2, rock: 2, bug: 0.5,
        steel: 0.5, fire: 0.5, water: 2, grass: 0.5, dragon: 0.5,
    },
    ground: {
        flying: 0, poison: 2, rock: 2,
        bug: 0.5, steel: 2, fire: 2, grass: 0.5,
        electric: 2,
    },
    ice: {
        flying: 2, ground: 2,
        steel: 0.5, fire: 0.5, water: 0.5, grass: 2,
        ice: 0.5, dragon: 2,
    },
    normal: {
        rock: 0.5, ghost: 0, steel: 0.5,
    },
    poison: {
        poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0,
        grass: 2, fairy: 2,
    },
    psychic:  {
        fighting: 2, poison: 2, steel: 0.5, psychic: 0.5, dark: 0,
    },
    rock: {
        fighting: 0.5, flying: 2, ground: 0.5, bug: 2, steel: 0.5,
        fire: 2, ice: 2,
    },
    steel: {
        rock: 2, steel: 0.5, fire: 0.5, water: 0.5, electric: 0.5,
        ice: 2, fairy: 2,
    },
    water: {
        ground: 2, rock: 2, fire: 2, water: 0.5, grass: 0.5,
        dragon: 0.5,
    },
};

export function getTypeBoost(attacker: PokemonType, target: PokemonType): number {
    const boost = typeBoosts[attacker][target];
    return (boost === undefined) ? 1 : boost;
}
