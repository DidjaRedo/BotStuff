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

import * as TimeConverters from '../time/timeConverters';
import { DateRange, ExplicitDateRange } from '../time/dateRange';
import { KeyedThing, Names } from '../names/names';
import { RaidTier, validateRaidTier } from './game';
import { Result, allSucceed, captureResult, fail, populateObject, succeed } from '@fgv/ts-utils';
import { Boss } from './boss';
import { BossDirectory } from './bossDirectory';
import { DirectoryOptions } from '../names/directory';
import { GlobalGymDirectory } from './gymDirectory';
import { Gym } from './gym';
import { JsonObject } from '@fgv/ts-utils/jsonHelpers';
import moment from 'moment';

export interface RaidKeys {
    readonly name: string;
    readonly gymName: string;
}

export type RaidType = 'normal'|'raid-hour';
export type RaidState = 'future'|'upcoming'|'active'|'expired';
export type CategorizedRaids = Record<RaidState, Raid[]>;

export const MAX_EGG_HATCH_TIME = 60;
export const MAX_NORMAL_RAID_ACTIVE_TIME = 45;
export const MAX_RAID_HOUR_RAID_ACTIVE_TIME = 60;
export const RAID_TIME_FORMAT = 'h:mm A';

export function isValidRaidType(type: string): type is RaidType {
    return (type === 'normal') || (type === 'raid-hour');
}

export function validateRaidType(value: unknown): Result<RaidType> {
    if (typeof value === 'string') {
        const type = value.trim().toLowerCase();
        if (isValidRaidType(type)) {
            return succeed(type);
        }
    }
    return fail(`Invalid raid type "${JSON.stringify(value)}" (normal/raid-hour)`);
}

export interface RaidOptions {
    force?: true,
}

export interface RaidInitializer {
    tier: RaidTier;
    gym: Gym;
    boss?: Boss;
    raidTimes: ExplicitDateRange;
    raidType?: RaidType;
}

export interface RaidProperties extends RaidKeys, RaidInitializer {
}

export interface RaidJson {
    boss?: string;
    gym: string;
    hatch: string;
    tier?: RaidTier;
    type: RaidType;
}

export class Raid implements KeyedThing<RaidKeys>, RaidProperties {
    public readonly name: string;
    public readonly primaryKey: string;
    public readonly keys: RaidKeys;

    public get gymName(): string { return this.gym.name; }
    public get bossName(): string { return this.boss?.displayName ?? 'undefined'; }
    public get tier(): RaidTier { return this._tier; }
    public readonly gym: Gym;
    public get boss(): Boss|undefined { return this._boss; }
    public get hatchTime(): Date { return this.raidTimes.start; }
    public get expiryTime(): Date { return this.raidTimes.end; }
    public readonly raidTimes: ExplicitDateRange;
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
            case 'future': case 'upcoming':
            case 'active': case 'expired':
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

    public static getRaidTimesForFutureRaid(timerInMinutes: number, raidType?: RaidType): Result<ExplicitDateRange>;
    public static getRaidTimesForFutureRaid(startTime: Date, raidType?: RaidType): Result<ExplicitDateRange>;
    public static getRaidTimesForFutureRaid(timerOrStart: Date|number, raidType?: RaidType): Result<ExplicitDateRange> {
        if (typeof timerOrStart === 'number') {
            return Raid._getRaidTimesFromEggTimer(timerOrStart, raidType);
        }
        return Raid._getRaidTimesFromStartTime(timerOrStart, raidType);
    }

    public static getRaidTimesForActiveRaid(timeInMinutes: number, raidType?: RaidType): Result<ExplicitDateRange> {
        const max = Raid.getRaidDuration(raidType);
        if ((timeInMinutes < 1) || (timeInMinutes > max)) {
            return fail(`Raid timer ${timeInMinutes} is out of range (1..${max})`);
        }
        const end = moment().add(timeInMinutes, 'minutes');
        return DateRange.createExplicitDateRange({
            start: end.clone().subtract(max, 'minutes').toDate(),
            end: end.toDate(),
        });
    }

    public static getStateFromRaidTimes(raidTimes: ExplicitDateRange, fromDate?: Date, raidType?: RaidType): Result<RaidState> {
        const valid = Raid._validateRaidTimes(raidTimes, raidType);
        if (valid.isFailure()) {
            return fail(valid.message);
        }

        fromDate = fromDate ?? new Date();
        switch (raidTimes.check(fromDate)) {
            case 'included': return succeed('active');
            case 'less':
                if (raidTimes.timeUntil('start', fromDate, 'minutes') > 60) {
                    return succeed('future');
                }
                return succeed('upcoming');
        }
        return succeed('expired');
    }

    public static getCurrentStateFromRaidTimes(raidTimes: ExplicitDateRange, raidType?: RaidType): Result<RaidState> {
        return Raid.getStateFromRaidTimes(raidTimes, new Date(), raidType);
    }

    public static createFutureRaid(start: Date, gym: Gym|undefined, tier: RaidTier, raidType?: RaidType): Result<Raid>;
    public static createFutureRaid(startsIn: number, gym: Gym|undefined, tier: RaidTier, raidType?: RaidType): Result<Raid>;
    public static createFutureRaid(start: Date|number, gym: Gym|undefined, tier: RaidTier, raidType?: RaidType): Result<Raid> {
        if (gym === undefined) {
            return fail('Gym must be specified for a future raid.');
        }

        const times = Raid.getRaidTimesForFutureRaid(start as number, raidType);
        if (times.isFailure()) {
            return fail(times.message);
        }

        const raidTimes = times.value;
        return captureResult(() => new Raid({ tier, gym, raidTimes, raidType }));
    }

    public static createActiveRaid(timeLeftInMinutes: number, gym: Gym|undefined, boss: Boss|undefined, raidType?: RaidType): Result<Raid> {
        if (gym === undefined) {
            return fail('Gym must be specified for an active raid.');
        }
        if (boss === undefined) {
            return fail('Boss must be specified for an active raid');
        }

        const times = Raid.getRaidTimesForActiveRaid(timeLeftInMinutes, raidType);
        if (times.isFailure()) {
            return fail(times.message);
        }
        const tier = boss.tier;
        const raidTimes = times.value;

        return captureResult(() => new Raid({ tier, gym, boss, raidTimes, raidType }));
    }

    public static compare(r1: Raid, r2: Raid): number {
        let diff = r1.hatchTime.getTime() - r2.hatchTime.getTime();
        if (diff === 0) {
            diff = r1.gymName.localeCompare(r2.gymName);
        }
        return ((diff < 0) ? -1 : ((diff > 0) ? 1 : 0));
    }

    public static createFromJson(json: RaidJson, gyms: GlobalGymDirectory, bosses: BossDirectory): Result<Raid> {
        return populateObject<RaidInitializer>({
            gym: () => gyms.lookupExact(json.gym).single().onSuccess((sr) => succeed(sr.item)),
            boss: () => json.boss ? bosses.getByAnyFieldExact(json.boss).single() : succeed(undefined),
            raidTimes: () => {
                return TimeConverters.date.convert(json.hatch).onSuccess((hatch) => {
                    return this._getRaidTimesFromStartTime(hatch, json.type, { force: true });
                });
            },
            tier: (state) => validateRaidTier(json.tier ?? state.boss?.tier),
            raidType: () => validateRaidType(json.type),

        }).onSuccess((init: RaidInitializer) => {
            return captureResult(() => new Raid(init));
        });
    }

    public static categorizeRaids(raids: Raid[]): CategorizedRaids {
        const categorized: CategorizedRaids = {
            future: [],
            active: [],
            upcoming: [],
            expired: [],
        };
        for (const raid of raids) {
            categorized[raid.state].push(raid);
        }
        return categorized;
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

    protected static _getRaidTimesFromStartTime(hatchTime: Date, raidType?: RaidType, options?: RaidOptions): Result<ExplicitDateRange> {
        const hatch = moment(hatchTime);
        const delta = hatch.diff(moment(), 'minutes');

        if (options?.force !== true) {
            if (delta > MAX_EGG_HATCH_TIME) {
                return fail(`Requested hatch time ${hatch.format(RAID_TIME_FORMAT)} is too far in the future (max ${MAX_EGG_HATCH_TIME} minutes).`);
            }
            else if (delta < -1) {
                // a little fudge factor for people adding a raid right at hatch
                return fail(`Requested hatch time ${hatch.format(RAID_TIME_FORMAT)} is in the past.`);
            }
        }

        return DateRange.createExplicitDateRange({
            start: hatch.toDate(),
            end: hatch.clone().add(Raid.getRaidDuration(raidType), 'minutes').toDate(),
        });
    }

    protected static _getRaidTimesFromEggTimer(timeInMinutes: number, raidType?: RaidType): Result<ExplicitDateRange> {
        if ((timeInMinutes < 1) || (timeInMinutes > MAX_EGG_HATCH_TIME)) {
            return fail(`Egg timer ${timeInMinutes} is out of range (1..${MAX_EGG_HATCH_TIME})`);
        }
        const start = moment().add(timeInMinutes, 'minutes');
        return DateRange.createExplicitDateRange({
            start: start.toDate(),
            end: start.clone().add(Raid.getRaidDuration(raidType), 'minutes').toDate(),
        });
    }

    private static _getName(gymKey: string, startTime: Date): string {
        return `${moment(startTime).format('YYYY-MM-DD_HH:MM')}@${gymKey}`;
    }

    private static _validateRaidTimes(times: ExplicitDateRange, raidType?: RaidType): Result<ExplicitDateRange> {
        const got = times.duration('minutes');
        const expected = Raid.getRaidDuration(raidType);
        if (got !== expected) {
            return fail(`Invalid raid duration - got ${got}, expected ${expected}.`);
        }
        return succeed(times);
    }

    private static _validateBoss(boss?: Boss, tier?: RaidTier): Result<Boss|undefined> {
        if ((boss !== undefined) && (tier !== undefined) && (boss.tier !== tier)) {
            return fail(`Mismatched tier: ${boss.name} is tier ${boss.tier} but raid is ${tier}`);
        }
        return succeed(boss);
    }

    private static _validateInitializer(init: RaidInitializer): Result<ExplicitDateRange> {
        return allSucceed([
            validateRaidTier(init.tier),
            Raid._validateBoss(init.boss, init.tier),
        ], true).onSuccess(() => {
            return Raid._validateRaidTimes(init.raidTimes, init.raidType);
        });
    }

    public update(tier: RaidTier): Result<RaidTier>;
    public update(boss: Boss): Result<Boss>;
    public update(tierOrBoss: RaidTier|Boss): Result<RaidTier|Boss|undefined> {
        if (typeof tierOrBoss === 'number') {
            if (this.boss !== undefined) {
                return fail('Cannot change tier once a boss is assigned.');
            }
            const oldTier = this._tier;
            this._tier = tierOrBoss;
            return succeed(oldTier);
        }

        if ((this.state !== 'active') && (this.state !== 'expired')) {
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

    public toString(): string {
        return this.primaryKey;
    }

    public toJson(): JsonObject {
        return {
            boss: this.boss?.primaryKey,
            gym: this.gym.primaryKey,
            hatch: this.raidTimes.start.toISOString(),
            tier: this.tier,
            type: this.raidType,
        };
    }

    public toArray(): (string|number)[] {
        return [
            this.raidTimes.start.toISOString(),
            this.gym.primaryKey,
            this.boss?.primaryKey ?? this.tier,
            this.raidType,
        ];
    }
}
