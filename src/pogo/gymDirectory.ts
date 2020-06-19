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
import * as Gym from './gym';
import * as Merge from '../utils/merge';
import * as PoiLookupOptions from '../places/poiLookupOptions';
import { Result, captureResult } from '../utils/result';
import { Converter } from '../utils/converter';
import { GlobalPoiDirectoryBase } from '../places/globalPoiDirectory';
import { loadJsonFile } from '../utils/jsonHelpers';

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

export const optionsMerger = new Merge.ObjectMerger(optionsFieldMergers);

export class GlobalGymDirectory extends GlobalPoiDirectoryBase<Gym.Gym, GymLookupOptionsProperties> {
    public constructor(options?: Partial<GymLookupOptionsProperties>, gyms?: Iterable<Gym.Gym>) {
        super(options, gyms);
    }

    public static createGymDirectory(options?: Partial<GymLookupOptionsProperties>, gyms?: Iterable<Gym.Gym>): Result<GlobalGymDirectory> {
        return captureResult(() => new GlobalGymDirectory(options, gyms));
    }

    public static filter(gym: Gym.Gym, options?: Partial<GymLookupOptionsProperties>): boolean {
        switch (options?.exFilter) {
            case 'exEligible': return gym.isExEligible;
            case 'nonEx': return !gym.isExEligible;
        }
        return true;
    }

    protected _getEffectiveOptions(user: Partial<GymLookupOptionsProperties>): GymLookupOptionsProperties {
        const base = this.options ?? PoiLookupOptions.defaultProperties;
        if (user) {
            return optionsMerger.mergeIntoCopy(base, user).getValueOrThrow();
        }
        return base;
    }

    protected _filterPoi(gym: Gym.Gym, options: GymLookupOptionsProperties): boolean {
        return GlobalGymDirectory.filter(gym, options);
    }
}

export function globalGymDirectory(options?: Partial<GymLookupOptionsProperties>): Converter<GlobalGymDirectory> {
    return Converters.arrayOf(Gym.gym).map((gyms) => GlobalGymDirectory.createGymDirectory(options, gyms));
}

export function loadGlobalGymDirectorySync(path: string, options?: Partial<GymLookupOptionsProperties>): Result<GlobalGymDirectory> {
    return loadJsonFile(path).onSuccess((json) => {
        return globalGymDirectory(options).convert(json);
    });
}
