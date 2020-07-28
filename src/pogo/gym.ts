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

import { Poi, PoiProperties } from '../places/poi';
import { Result, captureResult } from '@fgv/ts-utils';
import { JsonObject } from '@fgv/ts-utils/jsonHelpers';

export interface GymProperties extends PoiProperties {
    isExEligible: boolean;
}

export class Gym extends Poi implements GymProperties {
    public readonly isExEligible: boolean;

    public constructor(init: GymProperties) {
        super(init);
        this.isExEligible = init.isExEligible;
    }

    public static createGym(init: GymProperties): Result<Gym> {
        return captureResult(() => new Gym(init));
    }

    public toString(): string {
        return this.primaryKey;
    }

    public toArray(): (string|number)[] {
        return [
            this.zones.join('|'),
            this.city,
            [this.name, ...this.alternateNames].join('|'),
            this.coord.latitude,
            this.coord.longitude,
            this.isExEligible ? 'ex' : 'nonEx',
        ];
    }

    public toJson(): JsonObject {
        return {
            zones: this.zones,
            city: this.city,
            name: this.name,
            alternateNames: this.alternateNames,
            coord: {
                latitude: this.coord.latitude,
                longitude: this.coord.longitude,
            },
            isExEligible: (this.isExEligible ? 'ex' : 'nonEx'),
        };
    }
}

