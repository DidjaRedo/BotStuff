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

import { CategorizedRaids, Raid } from '../raid';
import { Formattable, FormattableBase, FormattersByTarget, formatList } from '../../utils/formatter';
import { Boss } from '../boss';
import FlexTime from '../../time/flexTime';
import { Result } from '../../utils/result';
import moment from 'moment';

export interface RaidFormatter extends Formattable {
    state: string;
    tier: string;
    gymName: string;
    exStatus: string;
    directions: string;
    nameAndDirections: string;
    nameDirectionsAndExStatus: string;
    bossName: string;
    bossDescription: string;
    hatchTime: string;
    expiryTime: string;
    city: string;
    guideLink: string;

    futureRaidDescription: string;
    upcomingRaidDescription: string;
    activeRaidDescription: string;
    expiredRaidDescription: string;

    description: string;
}

export class TextRaidFormatter extends FormattableBase implements RaidFormatter {
    private readonly _raid: Raid;

    public get state(): string {
        switch (this._raid.state) {
            case 'future': return 'Future';
            case 'upcoming': return 'Upcoming';
            case 'active': return 'Current';
            case 'expired': return 'Expired';
        }
    }

    public get tier(): string { return `T${this._raid.tier}`; }
    public get gymName(): string { return this._raid.gymName; }
    public get exStatus(): string { return (this._raid.gym.isExEligible ? ' [EX]' : ''); }
    public get directions(): string { return this._raid.gym.getDirectionsLink(); }
    public get nameAndDirections(): string { return this.gymName; }
    public get nameDirectionsAndExStatus(): string { return `${this.gymName}${this.exStatus}`; }
    public get bossName(): string { return this._raid.boss?.displayName ?? 'Unknown'; }
    public get bossDescription(): string { return `${this.tier} ${this.bossName}`; }
    public get hatchTime(): string { return this._formatTime(this._raid.hatchTime); }
    public get expiryTime(): string { return this._formatTime(this._raid.expiryTime); }
    public get city(): string { return this._raid.gym.city; }
    public get guideLink(): string { return Boss.getGuideUrl(this._raid.boss); }

    public get futureRaidDescription(): string { return this.upcomingRaidDescription; }
    public get upcomingRaidDescription(): string { return `[${this.tier}] ${this.nameDirectionsAndExStatus} @ ${this.hatchTime}`; }
    public get activeRaidDescription(): string { return `[${this.bossDescription}] ${this.nameDirectionsAndExStatus} ends @ ${this.expiryTime}`; }
    public get expiredRaidDescription(): string { return `[${this.bossDescription}] ${this.nameDirectionsAndExStatus} ended @ ${this.expiryTime}`; }

    public get description(): string {
        switch (this._raid.state) {
            case 'future': return this.futureRaidDescription;
            case 'upcoming': return this.upcomingRaidDescription;
            case 'active': return this.activeRaidDescription;
            case 'expired': return this.expiredRaidDescription;
        }
    }

    public constructor(raid: Raid) {
        super();
        this._raid = raid;
    }

    protected _formatTime(time: Date): string {
        if ((this._raid.state === 'future') || (this._raid.state === 'expired')) {
            return moment(time).format('YYYY-MM-DD h:mm A');
        }
        return FlexTime.formatTimeAmPm(time);
    }
}

// format raid times
export class MarkdownRaidFormatter extends TextRaidFormatter {
    public get upcomingRaidDescription(): string { return `[${this.tier}] ${this.nameDirectionsAndExStatus} *@ ${this.hatchTime}*`; }
    public get activeRaidDescription(): string { return `[${this.bossDescription}] ${this.nameDirectionsAndExStatus} *ends @ ${this.expiryTime}*`; }
    public get expiredRaidDescription(): string { return `[${this.bossDescription}] ${this.nameDirectionsAndExStatus} *ended @ ${this.expiryTime}*`; }
}

// include links for guide and directions
export class EmbedRaidFormatter extends MarkdownRaidFormatter {
    public get nameAndDirections(): string { return `[${this.gymName}](${this.directions})`; }
    public get nameDirectionsAndExStatus(): string { return `[${this.gymName}](${this.directions})${this.exStatus}`; }

    public get bossDescription(): string { return `[${super.bossDescription}](${this.guideLink})`; }
}

export const raidFormatters: FormattersByTarget<Raid> = {
    text: (format: string, raid: Raid): Result<string> => {
        return new TextRaidFormatter(raid).format(format);
    },
    markdown: (format: string, raid: Raid): Result<string> => {
        return new MarkdownRaidFormatter(raid).format(format);
    },
    embed: (format: string, raid: Raid): Result<string> => {
        return new EmbedRaidFormatter(raid).format(format);
    },
};

export const raidsFormatters: FormattersByTarget<Raid[]> = {
    text: (format: string, raids: Raid[]): Result<string> => {
        return formatList(format, raids, raidFormatters.text);
    },
    markdown: (format: string, raids: Raid[]): Result<string> => {
        return formatList(format, raids, raidFormatters.markdown);
    },
    embed: (format: string, raids: Raid[]): Result<string> => {
        return formatList(format, raids, raidFormatters.embed);
    },
};

export interface CategorizedRaidsFormatter extends Formattable {
    header(label?: string): string;
    futureHeader(label?: string): string;
    upcomingHeader(label?: string): string;
    activeHeader(label?: string): string;
    expiredHeader(label?: string): string;

    future(label?: string): string|undefined;
    upcoming(label?: string): string|undefined;
    active(label?: string): string|undefined;
    expired(label?: string): string|undefined;
    description(label?: string): string;
}

export class TextCategorizedRaidsFormatter extends FormattableBase implements CategorizedRaidsFormatter {
    protected readonly _raids: CategorizedRaids;

    public constructor(raids: CategorizedRaids) {
        super();
        this._raids = raids;
    }

    public header(label?: string): string {
        return this._formatHeader(label ? `RAIDS (${label})` : 'RAIDS');
    }

    public futureHeader(label?: string): string {
        return this._formatHeader(label ? `FUTURE RAIDS (${label})` : 'FUTURE RAIDS');
    }

    public upcomingHeader(label?: string): string {
        return this._formatHeader(label ? `UPCOMING RAIDS (${label})` : 'UPCOMING RAIDS');
    }

    public activeHeader(label?: string): string {
        return this._formatHeader(label ? `ACTIVE RAIDS (${label})` : 'ACTIVE RAIDS');
    }

    public expiredHeader(label?: string): string {
        return this._formatHeader(label ? `EXPIRED RAIDS (${label})` : 'EXPIRED RAIDS');
    }

    public futureRaids(): string|undefined {
        return this._formatList(this._raids.future);
    }

    public upcomingRaids(): string|undefined {
        return this._formatList(this._raids.upcoming);
    }

    public activeRaids(): string|undefined {
        return this._formatList(this._raids.active);
    }

    public expiredRaids(): string|undefined {
        return this._formatList(this._raids.expired);
    }

    public future(label?: string): string|undefined {
        return this._formatList(this._raids.future, this.futureHeader(label));
    }

    public upcoming(label?: string): string|undefined {
        return this._formatList(this._raids.upcoming, this.upcomingHeader(label));
    }

    public active(label?: string): string|undefined {
        return this._formatList(this._raids.active, this.activeHeader(label));
    }

    public expired(label?: string): string|undefined {
        return this._formatList(this._raids.expired, this.expiredHeader(label));
    }

    public description(label?: string): string {
        const lines = [
            this.active(label),
            this.upcoming(label),
            this.future(label),
            this.expired(label),
        ].filter((s): s is string => s !== undefined);

        if (lines.length === 0) {
            lines.push(this.header(label));
            lines.push('No raids reported.');
        }

        return lines.join('\n');
    }

    protected _formatHeader(header: string): string {
        return header;
    }

    protected _formatList(raids: Raid[], title?: string): string|undefined {
        if (raids.length === 0) {
            return undefined;
        }
        return [
            title,
            ...raids.map((r) => this._formatRaid('{{description}}', r).getValueOrDefault()),
        ].filter((d): d is string => (d !== undefined)).join('\n');
    }

    protected _formatRaid(format: string, raid: Raid): Result<string> {
        return new TextRaidFormatter(raid).format(format);
    }
}

export class MarkdownCategorizedRaidsFormatter extends TextCategorizedRaidsFormatter {
    public constructor(raids: CategorizedRaids) {
        super(raids);
    }

    protected _formatHeader(header: string): string {
        return `__**${header}**__`;
    }

    protected _formatRaid(format: string, raid: Raid): Result<string> {
        return new EmbedRaidFormatter(raid).format(format);
    }
}

export const categorizedRaidsFormatters: FormattersByTarget<CategorizedRaids> = {
    text: (format: string, raids: CategorizedRaids): Result<string> => {
        return new TextCategorizedRaidsFormatter(raids).format(format);
    },
    markdown: (format: string, raids: CategorizedRaids): Result<string> => {
        return new MarkdownCategorizedRaidsFormatter(raids).format(format);
    },
    embed: (format: string, raids: CategorizedRaids): Result<string> => {
        return new MarkdownCategorizedRaidsFormatter(raids).format(format);
    },
};
