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

import { Boss } from './boss';
import FlexTime from '../time/flexTime';
import { Raid } from './raid';
import moment from 'moment';

export type FormatTarget = 'text'|'markdown'|'embed';

export interface RaidFormatter {
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
    nowTime: string;
    city: string;
    guideLink: string;

    futureRaidDescription: string;
    upcomingRaidDescription: string;
    activeRaidDescription: string;
    expiredRaidDescription: string;

    description: string;
}

export class TextRaidFormatter implements RaidFormatter {
    private readonly _raid: Raid;

    public get state(): string {
        switch (this._raid.state) {
            case 'future': return 'Future';
            case 'egg': return 'Upcoming';
            case 'hatched': return 'Current';
            case 'expired': return 'Expired';
        }
    }

    public get tier(): string { return `T${this._raid.tier}`; }
    public get gymName(): string { return this._raid.gymName; }
    public get exStatus(): string { return (this._raid.gym.isExEligible ? ' [EX]' : ''); }
    public get directions(): string { return this._raid.gym.getDirectionsLink(); }
    public get nameAndDirections(): string { return this.gymName; }
    public get nameDirectionsAndExStatus(): string { return `${this.gymName}${this.exStatus}`; }
    public get bossName(): string { return this._raid.boss?.name ?? 'Unknown'; }
    public get bossDescription(): string { return `${this.tier} ${this.bossName}`; }
    public get hatchTime(): string { return this._formatTime(this._raid.hatchTime); }
    public get expiryTime(): string { return this._formatTime(this._raid.expiryTime); }
    public get nowTime(): string { return this._formatTime(new Date()); }
    public get city(): string { return this._raid.gym.city; }
    public get guideLink(): string { return Boss.getGuideUrl(this._raid.boss); }

    public get futureRaidDescription(): string { return this.upcomingRaidDescription; }
    public get upcomingRaidDescription(): string { return `[${this.tier}] ${this.nameDirectionsAndExStatus} @ ${this.hatchTime}`; }
    public get activeRaidDescription(): string { return `[${this.bossDescription}] ${this.nameDirectionsAndExStatus} ends @ ${this.expiryTime}`; }
    public get expiredRaidDescription(): string { return `[${this.bossDescription}] ${this.nameDirectionsAndExStatus} ended @ ${this.expiryTime}`; }

    public get description(): string {
        switch (this._raid.state) {
            case 'future': return this.futureRaidDescription;
            case 'egg': return this.upcomingRaidDescription;
            case 'hatched': return this.activeRaidDescription;
            case 'expired': return this.expiredRaidDescription;
        }
    }

    public constructor(raid: Raid) {
        this._raid = raid;
    }

    protected _formatTime(time: Date): string {
        if ((this._raid.state === 'future') || (this._raid.state === 'expired')) {
            return moment(time).format('YYYY-MM-DD h:mm a');
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

