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

import { RaidTier, validateRaidTier } from './pogo';
import { Result, allSucceed, captureResult, fail, succeed } from '../utils/result';
import { Boss } from './boss';
import { DateRange } from '../time/dateRange';
import { DirectoryOptions } from '../names/directory';
import { Gym } from './gym';
import { KeyedThing } from '../names/keyedThing';
import { Names } from '../names/names';
import moment from 'moment';

export interface RaidKeys {
    readonly name: string;
    readonly gymName: string;
}

export type RaidType = 'normal'|'raid-hour';
export type RaidState = 'future'|'egg'|'hatched'|'expired';

export const MAX_EGG_HATCH_TIME = 60;
export const MAX_NORMAL_RAID_ACTIVE_TIME = 45;
export const MAX_RAID_HOUR_RAID_ACTIVE_TIME = 60;
export const RAID_TIME_FORMAT = 'h:mm A';

export interface RaidInitializer {
    tier: RaidTier;
    gym: Gym;
    boss?: Boss;
    raidTimes: DateRange;
    raidType?: RaidType;
}

export interface RaidProperties extends RaidKeys, RaidInitializer {
}

export class Raid implements KeyedThing<RaidKeys>, RaidProperties {
    public readonly name: string;
    public readonly primaryKey: string;
    public readonly keys: RaidKeys;

    public get gymName(): string { return this.gym.name; }
    public get tier(): RaidTier { return this._tier; }
    public readonly gym: Gym;
    public get boss(): Boss|undefined { return this._boss; }
    public get hatchTime(): Date|undefined { return this.raidTimes.min; }
    public get expiryTime(): Date|undefined { return this.raidTimes.max; }
    public readonly raidTimes: DateRange;
    public get state(): RaidState { return this._state; }
    public readonly raidType: RaidType;

    private _boss?: Boss;
    private _tier: RaidTier;
    private _state: RaidState;

    protected constructor(init: RaidInitializer) {
        Raid._validateInitializer(init).getValueOrThrow();

        this.name = Raid._getName(init.gym.name, init.raidTimes.start);
        this.primaryKey = Names.normalize(this.name).getValueOrThrow();
        this.keys = { name: this.primaryKey, gymName: init.gym.primaryKey };
        this._tier = init.tier;
        this.gym = init.gym;
        this._boss = init.boss;
        this.raidTimes = init.raidTimes;
        this._state = Raid.getCurrentStateFromRaidTimes(init.raidTimes, init.raidType).getValueOrThrow();
        this.raidType = init.raidType ?? 'normal';
    }

    public static isValidRaidState(value: string): value is RaidState {
        switch (value) {
            case 'future': case 'egg':
            case 'hatched': case 'expired':
                return true;
        }
        return false;
    }

    public static validateRaidState(value?: unknown): Result<RaidState> {
        if (typeof value === 'string') {
            const stringValue = value.trim().toLowerCase();
            if (Raid.isValidRaidState(stringValue)) {
                return succeed(stringValue);
            }
        }
        return fail(`Invalid raid state ${JSON.stringify(value)}`);
    }

    public static getRaidDuration(raidType?: RaidType): number {
        return (raidType === 'raid-hour') ? MAX_RAID_HOUR_RAID_ACTIVE_TIME : MAX_NORMAL_RAID_ACTIVE_TIME;
    }

    public static getRaidTimesForFutureRaid(timerInMinutes: number, raidType?: RaidType): Result<DateRange>;
    public static getRaidTimesForFutureRaid(startTime: Date, raidType?: RaidType): Result<DateRange>;
    public static getRaidTimesForFutureRaid(timerOrStart: Date|number, raidType?: RaidType): Result<DateRange> {
        if (typeof timerOrStart === 'number') {
            return Raid._getRaidTimesFromEggTimer(timerOrStart, raidType);
        }
        return Raid._getRaidTimesFromStartTime(timerOrStart, raidType);
    }

    public static getRaidTimesForActiveRaid(timeInMinutes: number, raidType?: RaidType): Result<DateRange> {
        const max = Raid.getRaidDuration(raidType);
        if ((timeInMinutes < 1) || (timeInMinutes > max)) {
            return fail(`Raid timer ${timeInMinutes} is out of range (1..${max})`);
        }
        const end = moment().add(timeInMinutes, 'minutes');
        return DateRange.createDateRange({
            start: end.clone().subtract(max, 'minutes').toDate(),
            end: end.toDate(),
        });
    }

    public static getStateFromRaidTimes(raidTimes: DateRange, fromDate?: Date, raidType?: RaidType): Result<RaidState> {
        const valid = Raid._validateRaidTimes(raidTimes, raidType);
        if (valid.isFailure()) {
            return fail(valid.message);
        }

        fromDate = fromDate ?? new Date();
        switch (raidTimes.check(fromDate)) {
            case 'included': return succeed('hatched');
            case 'less':
                if (raidTimes.timeUntil('start', fromDate, 'minutes') > 60) {
                    return succeed('future');
                }
                return succeed('egg');
        }
        return succeed('expired');
    }

    public static getCurrentStateFromRaidTimes(raidTimes: DateRange, raidType?: RaidType): Result<RaidState> {
        return Raid.getStateFromRaidTimes(raidTimes, new Date(), raidType);
    }

    public static createFutureRaid(start: Date, gym: Gym, tier: RaidTier, raidType?: RaidType): Result<Raid>;
    public static createFutureRaid(startsIn: number, gym: Gym, tier: RaidTier, raidType?: RaidType): Result<Raid>;
    public static createFutureRaid(start: Date|number, gym: Gym, tier: RaidTier, raidType?: RaidType): Result<Raid> {
        const times = Raid.getRaidTimesForFutureRaid(start as number, raidType);
        if (times.isFailure()) {
            return fail(times.message);
        }

        const raidTimes = times.value;
        return captureResult(() => new Raid({ tier, gym, raidTimes, raidType }));
    }

    public static createActiveRaid(timeLeftInMinutes: number, gym: Gym, boss: Boss, raidType?: RaidType): Result<Raid> {
        const times = Raid.getRaidTimesForActiveRaid(timeLeftInMinutes, raidType);
        if (times.isFailure()) {
            return fail(times.message);
        }
        const tier = boss.tier;
        const raidTimes = times.value;

        return captureResult(() => new Raid({ tier, gym, boss, raidTimes, raidType }));
    }

    public static getDirectoryOptions(): DirectoryOptions<Raid, RaidProperties, RaidKeys> {
        return {
            threshold: 0.8,
            textSearchKeys: [
                {
                    name: 'name',
                    weight: 3,
                },
                {
                    name: 'gymName',
                    weight: 2,
                },
            ],
            alternateKeys: ['gymName'],
            enforceAlternateKeyUniqueness: ['name', 'gymName'],
        };
    }

    protected static _getRaidTimesFromStartTime(hatchTime: Date, raidType?: RaidType): Result<DateRange> {
        const hatch = moment(hatchTime);
        const delta = hatch.diff(moment(), 'minutes');

        if (delta > MAX_EGG_HATCH_TIME) {
            return fail(`Requested hatch time ${hatch.format(RAID_TIME_FORMAT)} is too far in the future (max ${MAX_EGG_HATCH_TIME} minutes).`);
        }
        else if (delta < -1) {
            // a little fudge factor for people adding a raid right at hatch
            return fail(`Requested hatch time ${hatch.format(RAID_TIME_FORMAT)} is in the past.`);
        }

        return DateRange.createDateRange({
            start: hatch.toDate(),
            end: hatch.clone().add(Raid.getRaidDuration(raidType), 'minutes').toDate(),
        });
    }

    protected static _getRaidTimesFromEggTimer(timeInMinutes: number, raidType?: RaidType): Result<DateRange> {
        if ((timeInMinutes < 1) || (timeInMinutes > MAX_EGG_HATCH_TIME)) {
            return fail(`Egg timer ${timeInMinutes} is out of range (1..${MAX_EGG_HATCH_TIME})`);
        }
        const start = moment().add(timeInMinutes, 'minutes');
        return DateRange.createDateRange({
            start: start.toDate(),
            end: start.clone().add(Raid.getRaidDuration(raidType), 'minutes').toDate(),
        });
    }

    private static _getName(gymKey: string, startTime: Date): string {
        return `${moment(startTime).format('YYYY-MM-DD_HH:MM')}@${gymKey}`;
    }

    private static _validateRaidTimes(raidTimes: DateRange, raidType?: RaidType): Result<DateRange> {
        if ((raidTimes.start === undefined) || (raidTimes.end === undefined)) {
            return fail('Raid times must define both start and end');
        }

        const got = raidTimes.duration('minutes');
        const expected = Raid.getRaidDuration(raidType);
        if (got !== expected) {
            return fail(`Invalid raid duration - got ${got}, expected ${expected}.`);
        }
        return succeed(raidTimes);
    }

    private static _validateBoss(boss?: Boss, tier?: RaidTier): Result<Boss|undefined> {
        if ((boss !== undefined) && (tier !== undefined) && (boss.tier !== tier)) {
            return fail(`Mismatched tier: ${boss.name} is tier ${boss.tier} but raid is ${tier}`);
        }
        return succeed(boss);
    }

    private static _validateInitializer(init: RaidInitializer): Result<boolean> {
        return allSucceed([
            validateRaidTier(init.tier),
            Raid._validateBoss(init.boss, init.tier),
            Raid._validateRaidTimes(init.raidTimes, init.raidType),
        ]);
    }


    public update(tier: RaidTier): Result<RaidTier>;
    public update(boss: Boss): Result<Boss>;
    public update(tierOrBoss: RaidTier|Boss): Result<RaidTier|Boss> {
        if (typeof tierOrBoss === 'number') {
            if (this.boss !== undefined) {
                return fail('Cannot change tier once a boss is assigned.');
            }
            const oldTier = this._tier;
            this._tier = tierOrBoss;
            return succeed(oldTier);
        }

        if ((this.state !== 'hatched') && (this.state !== 'expired')) {
            return fail('Cannot assign a boss to a future raid.');
        }
        const oldBoss = this._boss;
        this._tier = tierOrBoss.tier;
        this._boss = tierOrBoss;
        return succeed(oldBoss);
    }

    public refreshState(date?: Date): Result<RaidState> {
        const oldState = this._state;
        const stateResult = Raid.getStateFromRaidTimes(this.raidTimes, date, this.raidType);
        // istanbul ignore next
        if (stateResult.isFailure()) {
            return fail(stateResult.message);
        }
        this._state = stateResult.value;
        return succeed(oldState);
    }
}
