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

import { FormattableBase, FormattersByTarget } from '../../utils/formatter';
import { Gym } from '../gym';
import { Result } from '../../utils/result';

export interface GymFormatter {
    name: string;
    alternateNames: string|undefined;

    city: string;
    zones: string;

    coord: string;
    directions: string;
    directionsLink: string;

    exStatus: string;

    description: string;
    details: string;
}

export class TextGymFormatter extends FormattableBase implements GymFormatter {
    protected readonly _gym: Gym;

    public constructor(gym: Gym) {
        super();
        this._gym = gym;
    }

    public get name(): string { return this._gym.name; }
    public get alternateNames(): string|undefined {
        if (this._gym.alternateNames && (this._gym.alternateNames.length > 0)) {
            return this._gym.alternateNames.join(', ');
        }
        return undefined;
    }

    public get city(): string { return this._gym.city; }
    public get zones(): string {
        return this._gym.zones.join(', ');
    }

    public get coord(): string { return `${this._gym.coord.latitude}, ${this._gym.coord.longitude}`; }
    public get directionsLink(): string { return this._gym.getDirectionsLink(); }
    public get directions(): string { return this._gym.getDirectionsLink(); }

    public get exStatus(): string { return (this._gym.isExEligible ? 'EX-eligible' : 'non-EX'); }

    public get description(): string {
        const suffix = this._gym.isExEligible ? ' [EX]' : '';
        return `${this.name}${suffix}`;
    }

    public get details(): string {
        const lines: string[] = [];

        lines.push(`${this.description}`);
        FormattableBase._tryAddDetail(lines, 'aka', this.alternateNames);
        FormattableBase._tryAddDetail(lines, 'coordinates', this.coord);
        FormattableBase._tryAddDetail(lines, 'directions', this.directions);
        FormattableBase._tryAddDetail(lines, 'city', this.city);
        FormattableBase._tryAddDetail(lines, 'zones', this.zones);
        return lines.join('\n');
    }
}

// include links for directions
export class EmbedGymFormatter extends TextGymFormatter {
    public get directions(): string {
        return `[${this.coord}](${this.directionsLink})`;
    }
}

export const gymFormatters: FormattersByTarget<Gym> = {
    text: (format: string, gym: Gym): Result<string> => {
        return new TextGymFormatter(gym).format(format);
    },
    markdown: (format: string, gym: Gym): Result<string> => {
        return new TextGymFormatter(gym).format(format);
    },
    embed: (format: string, gym: Gym): Result<string> => {
        return new EmbedGymFormatter(gym).format(format);
    },
};
