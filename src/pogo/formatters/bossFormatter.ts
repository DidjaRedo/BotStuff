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

import {
    FormattableBase,
    FormattersByTarget,
    Result,
    mapResults,
    succeed,
} from '@fgv/ts-utils';
import { Boss } from '../boss';
import moment from 'moment';

export interface BossFormatter {
    name: string;
    displayName: string;
    alternateNames: string|undefined;
    otherNames: string|undefined;

    tier: string;
    description: string;

    pokedexNumber: string|undefined;

    raidGuide: string|undefined;
    image: string|undefined;

    raidGuideUrl: string|undefined;
    imageUrl: string|undefined;

    numRaiders?: string|undefined;
    cpRange: string|undefined;
    boostedCpRange: string|undefined;
    types: string|undefined;

    isActive: string;
    activeDates: string|undefined;
    status: string;

    details: string;
}

export class TextBossFormatter extends FormattableBase implements BossFormatter {
    protected readonly _boss: Boss;

    public constructor(boss: Boss) {
        super();
        this._boss = boss;
    }

    public get name(): string { return this._boss.name; }
    public get displayName(): string { return this._boss.displayName; }
    public get alternateNames(): string|undefined {
        // istanbul ignore else
        if (this._boss.alternateNames && (this._boss.alternateNames.length > 0)) {
            return this._boss.alternateNames.join(', ');
        }
        // istanbul ignore next
        return undefined;
    }

    public get otherNames(): string|undefined {
        // istanbul ignore next
        const alternates = this._boss.alternateNames ?? [];
        const other = [this._boss.name, ...alternates].filter((n) => n !== this._boss.displayName);
        return (other.length > 0) ? other.join(', ') : undefined;
    }

    public get tier(): string {
        return `T${this._boss.tier.toString()}`;
    }

    public get description(): string {
        return `${this.tier} ${this.displayName}`;
    }

    public get pokedexNumber(): string|undefined {
        if ((this._boss.pokedexNumber !== undefined) && (this._boss.pokedexNumber > 0)) {
            return this._boss.pokedexNumber.toString();
        }
        return undefined;
    }

    public get raidGuide(): string {
        return this._boss.raidGuideUrl;
    }

    public get image(): string {
        return this._boss.imageUrl;
    }

    public get raidGuideUrl(): string {
        return this._boss.raidGuideUrl;
    }

    public get imageUrl(): string {
        return this._boss.imageUrl;
    }

    public get numRaiders(): string|undefined {
        if ((this._boss.numRaiders === undefined) || (this._boss.numRaiders === 0)) {
            return undefined;
        }
        return this._boss.numRaiders.toString();
    }

    public get cpRange(): string|undefined {
        // istanbul ignore else
        if (this._boss.cpRange !== undefined) {
            return this._boss.cpRange.format(TextBossFormatter._formatNumber);
        }
        else {
            return undefined;
        }
    }

    public get boostedCpRange(): string| undefined {
        // istanbul ignore else
        if (this._boss.boostedCpRange !== undefined) {
            return this._boss.boostedCpRange.format(TextBossFormatter._formatNumber);
        }
        else {
            return undefined;
        }
    }

    public get types(): string|undefined {
        if (this._boss.types && (this._boss.types.length > 0)) {
            return this._boss.types.join(', ');
        }
        return undefined;
    }

    public get isActive(): string {
        return (this._boss.isActive() ? 'active' : 'inactive');
    }

    public get activeDates(): string|undefined {
        if ((this._boss.active === undefined) || (typeof this._boss.active === 'boolean')) {
            return undefined;
        }
        return this._boss.active.format(TextBossFormatter._formatDate);
    }

    public get status(): string {
        if ((this._boss.active === undefined) || (typeof this._boss.active === 'boolean')) {
            return this.isActive;
        }

        if (this._boss.isActive()) {
            if (this._boss.active.end !== undefined) {
                return `active until ${TextBossFormatter._formatDate(this._boss.active.end)}`;
            }
            if (this._boss.active.start !== undefined) {
                return `active since ${TextBossFormatter._formatDate(this._boss.active.start)}`;
            }
            return 'active';
        }
        const end = this._boss.active.end;
        if (end && (end.getTime() < Date.now())) {
            return `inactive since ${TextBossFormatter._formatDate(this._boss.active.end)}`;
        }
        return `inactive until ${TextBossFormatter._formatDate(this._boss.active.start)}`;
    }

    public get details(): string {
        const lines: string[] = [];

        lines.push(`${this.description}`);
        FormattableBase._tryAddDetail(lines, 'aka', this.otherNames);
        FormattableBase._tryAddDetail(lines, 'status', this.status);
        FormattableBase._tryAddDetail(lines, 'pokedex #', this.pokedexNumber);
        FormattableBase._tryAddDetail(lines, 'types', this.types);
        FormattableBase._tryAddDetail(lines, 'CP range', this.cpRange);
        FormattableBase._tryAddDetail(lines, 'Boosted CP range', this.boostedCpRange);
        FormattableBase._tryAddDetail(lines, 'raid guide', this.raidGuide);
        FormattableBase._tryAddDetail(lines, 'image', this.image);
        return lines.join('\n');
    }

    protected static _formatDate(date?: Date): string|undefined {
        // istanbul ignore else
        if (date !== undefined) {
            return moment(date).format('YYYY-MM-DD h:mm A');
        }
        else {
            return undefined;
        }
    }

    protected static _formatNumber(num?: number): string|undefined {
        return ((num !== undefined) && (num !== 0)) ? num.toString() : undefined;
    }
}

// include links for guide and image
export class EmbedBossFormatter extends TextBossFormatter {
    public get raidGuide(): string { return `[${this._boss.raidGuideName}](${this._boss.raidGuideUrl})`; }
    public get image(): string { return `[${this._boss.imageFileName}](${this._boss.imageUrl})`; }
    public get description(): string { return `[${super.description}](${this.raidGuideUrl})`; }
}

export const bossFormatters: FormattersByTarget<Boss> = {
    text: (format: string, boss: Boss): Result<string> => {
        return new TextBossFormatter(boss).format(format);
    },
    markdown: (format: string, boss: Boss): Result<string> => {
        return new TextBossFormatter(boss).format(format);
    },
    embed: (format: string, boss: Boss): Result<string> => {
        return new EmbedBossFormatter(boss).format(format);
    },
};

export const bossesFormatters: FormattersByTarget<Boss[]> = {
    text: (format: string, bosses: Boss[]): Result<string> => {
        return mapResults(bosses.map((b) => {
            return new TextBossFormatter(b).format(format);
        })).onSuccess((results: string[]) => {
            return succeed(results.join('\n'));
        });
    },
    markdown: (format: string, bosses: Boss[]): Result<string> => {
        return mapResults(bosses.map((b) => {
            return new TextBossFormatter(b).format(format);
        })).onSuccess((results: string[]) => {
            return succeed(results.join('\n'));
        });
    },
    embed: (format: string, bosses: Boss[]): Result<string> => {
        return mapResults(bosses.map((b) => {
            return new EmbedBossFormatter(b).format(format);
        })).onSuccess((results: string[]) => {
            return succeed(results.join('\n'));
        });
    },
};
