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

import * as Gym from './gym';
import * as Merge from '../utils/merge';
import * as PoiLookupOptions from '../places/poiLookupOptions';
import { Result, captureResult } from '@fgv/ts-utils';
import { GlobalPoiDirectoryBase } from '../places/globalPoiDirectory';

export interface GymLookupOptionsProperties extends PoiLookupOptions.Properties {
    exFilter?: 'nonEx'|'exEligible';
}

export const optionsFieldMergers: Merge.FieldMergers<GymLookupOptionsProperties, Merge.MergeOptions> = {
    options: {
        ...Merge.defaultMergeOptions,
        onUnknownField: 'ignore',
    },
    mergers: {
        ...PoiLookupOptions.fieldMergers.mergers,
        exFilter: Merge.item<'nonEx'|'exEligible'|undefined>(),
    },
};

function cloneGymLookupProperties(base?: GymLookupOptionsProperties): GymLookupOptionsProperties {
    return base ? { ...base } : PoiLookupOptions.defaultProperties;
}

export const optionsMerger = new Merge.ObjectMerger(optionsFieldMergers, cloneGymLookupProperties);

export class GlobalGymDirectory extends GlobalPoiDirectoryBase<Gym.Gym, GymLookupOptionsProperties> {
    public constructor(options?: Partial<GymLookupOptionsProperties>, gyms?: Iterable<Gym.Gym>) {
        super(options, gyms);
    }

    public static createGymDirectory(options?: Partial<GymLookupOptionsProperties>, gyms?: Iterable<Gym.Gym>): Result<GlobalGymDirectory> {
        return captureResult(() => new GlobalGymDirectory(options, gyms));
    }

    public static filter(gym: Gym.Gym, options?: Partial<GymLookupOptionsProperties>): boolean {
        if (options?.exFilter !== undefined) {
            if ((options.exFilter === 'exEligible' && !gym.isExEligible)
                || (options.exFilter === 'nonEx' && gym.isExEligible)) {
                return false;
            }
        }
        return PoiLookupOptions.filterPoi(gym, options);
    }

    protected _getEffectiveOptions(user: Partial<GymLookupOptionsProperties>): GymLookupOptionsProperties {
        const base = this.options ?? PoiLookupOptions.defaultProperties;
        if (user) {
            // cannot return undefined because base cannot be undefined
            return optionsMerger.mergeIntoCopy(base, user).getValueOrThrow() as GymLookupOptionsProperties;
        }
        return base;
    }

    protected _filterPoi(gym: Gym.Gym, options: GymLookupOptionsProperties): boolean {
        return GlobalGymDirectory.filter(gym, options);
    }
}
