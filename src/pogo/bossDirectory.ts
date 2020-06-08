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

import * as Converters from '../utils/converters';
import * as PogoConverters from './pogoConverters';
import * as TimeConverters from '../time/timeConverters';
import { Boss, BossKeys, BossProperties } from './boss';
import { DirectoryBase, DirectoryFilter, DirectoryLookupOptions, SearchResult } from '../names/directory';
import { Result, captureResult, fail, mapResults, succeed } from '../utils/result';
import { noTierBossPropertiesFromArray, noTierBossPropertiesFromObject } from './bossConverters';
import { Converter } from '../utils/converter';
import { DateRange } from '../time/dateRange';
import { NormalizedMap } from '../names/normalizedMap';
import { RaidTier } from './pogo';

export interface BossNamesByStatus {
    active: boolean|DateRange;
    bosses: string[];
}

export interface BossPropertiesByTier {
    tier: RaidTier;
    status?: BossNamesByStatus[];
    bosses: Partial<BossProperties>[];
}

export interface BossLookupOptions extends DirectoryLookupOptions {
    tier?: RaidTier;
    isActive?: boolean;
}

export class BossDirectory extends DirectoryBase<Boss, BossProperties, BossKeys, BossLookupOptions> {
    public constructor(bosses?: Iterable<Boss>) {
        super(Boss.getDirectoryOptions(), bosses);
    }

    public addTier(tier: BossPropertiesByTier): Boss[] {
        const toAdd = tier.bosses.map((b) => {
            if ((b.tier !== undefined) && (b.tier !== tier.tier)) {
                throw new Error(`Conflicting tier ${b.tier} for ${b.name} in tier ${tier.tier} boss definitions`);
            }

            return new Boss({
                ...b,
                tier: tier.tier,
            });
        });

        if (tier.status && tier.status.length > 0) {
            const bossMap = new NormalizedMap<Boss>();
            toAdd.forEach((b) => bossMap.setStrict(b.name, b));
            for (const byStatus of tier.status) {
                for (const bossName of byStatus.bosses) {
                    const boss = bossMap.tryGet(bossName);
                    if (!boss) {
                        throw new Error(`Boss ${bossName} not found for tier ${tier.tier} status ${JSON.stringify(byStatus.active)}`);
                    }
                    if (boss.active !== undefined) {
                        throw new Error(`Status multiply defined for ${bossName} (${JSON.stringify(boss.active)} and ${JSON.stringify(byStatus.active)})`);
                    }
                    boss.active = byStatus.active;
                }
            }
        }

        // any boss with undefined status is not active
        toAdd.forEach((b) => { b.active = b.active ?? false; });

        this.addRange(toAdd);
        return toAdd;
    }

    protected _adjustLookupResults(
        results: SearchResult<Boss>[],
        options?: BossLookupOptions,
        filter?: DirectoryFilter<Boss, BossLookupOptions>,
    ): SearchResult<Boss>[] {
        if (filter) {
            results = results.filter((r) => filter(r.item, options));
        }
        if (options) {
            results = results.filter((r) => {
                return ((options.isActive === undefined) || (options.isActive === r.item.isActive()))
                    && ((options.tier === undefined) || (options.tier === r.item.tier));
            });
        }
        return results;
    }
}

export const bossNamesByStatus = Converters.object<BossNamesByStatus>({
    active: Converters.oneOf<boolean|DateRange>([
        Converters.boolean,
        TimeConverters.dateRange,
    ]),
    bosses: Converters.arrayOf(Converters.string),
});


export const bossPropertiesByTier = Converters.object<BossPropertiesByTier>({
    tier: PogoConverters.raidTier,
    status: Converters.arrayOf(bossNamesByStatus),
    bosses: Converters.arrayOf(Converters.oneOf([
        noTierBossPropertiesFromObject,
        noTierBossPropertiesFromArray,
    ])),
}, ['status']);

export const bossDirectoryInitializer = Converters.arrayOf(bossPropertiesByTier);

export const bossDirectory = new Converter((from: unknown): Result<BossDirectory> => {
    const initResult = bossDirectoryInitializer.convert(from);
    if (initResult.isFailure()) {
        return fail(initResult.message);
    }

    const dir = new BossDirectory();

    const added = mapResults(initResult.value.map((tier) => {
        return captureResult(() => dir.addTier(tier));
    }));

    if (added.isFailure()) {
        return fail(added.message);
    }

    return succeed(dir);
});
