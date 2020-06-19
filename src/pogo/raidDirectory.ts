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
import * as Merge from '../utils/merge';
import * as PoiLookupOptions from '../places/poiLookupOptions';
import { DirectoryBase, DirectoryFilter, SearchResult } from '../names/directory';
import {
    GlobalGymDirectory,
    GymLookupOptionsProperties,
    optionsFieldMergers as gymLookupOptionsFieldMergers,
} from './gymDirectory';
import { Raid, RaidKeys, RaidProperties, RaidState, raid } from './raid';
import { Result, captureResult } from '../utils/result';
import { BossDirectory } from './bossDirectory';
import { Converter } from '../utils/converter';
import { RaidTier } from './pogo';
import { loadJsonFile } from '../utils/jsonHelpers';

export interface RaidLookupOptions extends GymLookupOptionsProperties {
    minTier?: RaidTier;
    maxTier?: RaidTier;
    stateFilter?: RaidState[],
}

export const optionsFieldMergers: Merge.FieldMergers<RaidLookupOptions, Merge.MergeOptions> = {
    options: {
        ...Merge.defaultMergeOptions,
        onUnknownField: 'ignore',
    },
    mergers: {
        ...gymLookupOptionsFieldMergers.mergers,
        minTier: Merge.item<RaidTier|undefined>(),
        maxTier: Merge.item<RaidTier|undefined>(),
        stateFilter: Merge.item<RaidState[]|undefined>(),
    },
};

export const optionsMerger = new Merge.ObjectMerger(optionsFieldMergers);

export class RaidDirectory extends DirectoryBase<Raid, RaidProperties, RaidKeys, RaidLookupOptions> {
    public constructor(raids?: Iterable<Raid>) {
        super(Raid.getDirectoryOptions(), raids);
    }

    public static create(raids?: Iterable<Raid>): Result<RaidDirectory> {
        return captureResult(() => new RaidDirectory(raids));
    }

    public static filter(raid: Raid, options?: Partial<RaidLookupOptions>): boolean {
        return ((options?.minTier === undefined) || (options.minTier <= raid.tier))
        && ((options?.maxTier === undefined) || (options.maxTier >= raid.tier))
        && ((options?.stateFilter === undefined) || (options.stateFilter.includes(raid.state)))
        && GlobalGymDirectory.filter(raid.gym, options);
    }

    protected _filterItems(
        raids: Raid[],
        options?: Partial<RaidLookupOptions>,
    ): Raid[] {
        return raids.filter((r) => RaidDirectory.filter(r, options));
    }

    protected _adjustSearchResults(
        results: SearchResult<Raid>[],
        options?: RaidLookupOptions,
        filter?: DirectoryFilter<Raid, RaidLookupOptions>,
    ): SearchResult<Raid>[] {
        if (filter) {
            results = results.filter((r) => filter(r.item, options));
        }
        if (options) {
            results = results.filter((r) => RaidDirectory.filter(r.item, options));
        }

        results = PoiLookupOptions.adjustObjectSearchResults(results, options, (r) => r.gym);
        return results;
    }
}

export function raidDirectory(gyms: GlobalGymDirectory, bosses: BossDirectory): Converter<RaidDirectory> {
    return Converters.arrayOf(raid(gyms, bosses)).map(RaidDirectory.create);
}

export function loadRaidDirectorySync(path: string, gyms: GlobalGymDirectory, bosses: BossDirectory): Result<RaidDirectory> {
    return loadJsonFile(path).onSuccess((json) => {
        return raidDirectory(gyms, bosses).convert(json);
    });
}
