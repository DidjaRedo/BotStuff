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

import * as Pogo from './game';
import { DateRange, DateRangeProperties } from '../time/dateRange';
import { Range, RangeProperties } from '../utils/range';
import { DirectoryOptions } from '../names/directory';
import { KeyedThing } from '../names/keyedThing';
import { Names } from '../names/names';
import { RaidTier } from './game';

export interface BossKeys {
    name: string;
    alternateNames?: string[];
}

export interface BossProperties extends BossKeys {
    displayName?: string;

    tier: RaidTier;
    pokedexNumber?: number;

    raidGuideName?: string;
    imageFileName?: string;

    numRaiders?: number;
    cpRange?: RangeProperties<number>;
    boostedCpRange?: RangeProperties<number>;
    types?: Pogo.PokemonType[];

    active?: boolean|DateRangeProperties;
}

export class Boss implements BossProperties, KeyedThing<BossKeys> {
    public readonly name: string;
    public readonly displayName: string;
    public readonly alternateNames?: string[];

    public readonly tier: RaidTier;
    public readonly pokedexNumber?: number;

    public readonly raidGuideName: string;
    public readonly imageFileName: string;

    public readonly numRaiders?: number;
    public readonly cpRange?: Range<number>;
    public readonly boostedCpRange?: Range<number>;
    public readonly types?: Pogo.PokemonType[];

    public active?: boolean|DateRange;

    public readonly keys: BossKeys;
    public readonly primaryKey: string;

    private readonly _raidGuideName?: string;
    private readonly _imageFileName?: string;

    public constructor(init: Partial<BossProperties>) {
        Names.throwOnInvalidName(init.name, 'boss name');

        // throwOnInvalidName ensures that init.name is not undefined
        this.name = init.name as string;
        this.alternateNames = init.alternateNames;
        this.displayName = init.displayName ?? this.name;
        this.tier = Pogo.validateRaidTier(init.tier).getValueOrThrow();
        this.pokedexNumber = init.pokedexNumber;
        this.numRaiders = init.numRaiders;
        this.cpRange = Range.createRange(init.cpRange).getValueOrDefault();
        this.boostedCpRange = Range.createRange(init.boostedCpRange).getValueOrDefault();
        this.types = init.types;

        if (init.raidGuideName) {
            this.raidGuideName = init.raidGuideName;
        }
        else {
            this.raidGuideName = Names.normalizeOrThrow(this.name).toUpperCase();
        }

        if (init.imageFileName) {
            this.imageFileName = init.imageFileName;
        }
        else {
            this.imageFileName = `T${init.tier}.png`;
        }

        if ((typeof init.active === 'boolean') || (init.active === undefined)) {
            this.active = init.active as boolean|undefined;
        }
        else {
            this.active = DateRange.createDateRange(init.active).getValueOrThrow();
        }

        this.primaryKey = Names.normalizeOrThrow(`${this.name} T${this.tier}`);
        this.keys = this._normalize();
    }

    public static getGuideUrl(boss?: Boss): string {
        return boss?.raidGuideUrl ?? 'https://www.pokebattler.com/raids';
    }

    public static getDirectoryOptions(): DirectoryOptions<Boss, BossProperties, BossKeys> {
        return {
            threshold: 0.6,
            textSearchKeys: [
                {
                    name: 'displayName',
                    weight: 0.35,
                },
                {
                    name: 'name',
                    weight: 0.35,
                },
                {
                    name: 'alternateNames',
                    weight: 0.3,
                },
            ],
            alternateKeys: ['name', 'alternateNames'],
            enforceAlternateKeyUniqueness: [],
        };
    }

    public isActive(date?: Date): boolean {
        if (typeof this.active === 'boolean') {
            return this.active;
        }
        else if (this.active === undefined) {
            return false;
        }
        return this.active.includes(date ?? new Date());
    }

    public get imageUrl(): string {
        return `http://www.didjaredo.com/pogo/images/32x32/${this.imageFileName}`;
    }

    public get raidGuideUrl(): string {
        return `https://www.pokebattler.com/raids/${this.raidGuideName.toUpperCase()}`;
    }

    protected _normalize(): BossKeys {
        return {
            name: Names.normalizeOrThrow(this.name),
            alternateNames: Names.tryNormalize(this.alternateNames || []),
        };
    }
}
