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

import { Gym, GymProperties } from '../../src/pogo/gym';
import { PoiGeneratorBase, PoiTestDataBase, PoiTestDataInitializer } from './placeHelpers';
import { Raid, RaidInitializer, RaidState } from '../../src/pogo/raid';
import { RaidTier, validateRaidTier } from '../../src/pogo/pogo';
import { Result, captureResult } from '../../src/utils/result';
import { Boss } from '../../src/pogo/boss';
import { BossDirectory } from '../../src/pogo/bossDirectory';
import { DateRange } from '../../src/time/dateRange';
import { GlobalGymDirectory } from '../../src/pogo/gymDirectory';
import moment from 'moment';

export class TestGymData extends PoiTestDataBase<GymProperties> {
    protected readonly _gyms?: GlobalGymDirectory;

    public constructor(init: PoiTestDataInitializer<GymProperties>, gyms?: GlobalGymDirectory) {
        super(init);
        this._gyms = gyms;
    }

    public getGyms(): Gym[] {
        if (this._gyms) {
            return this.poiProperties.map((p) => this._gyms.lookup(p.name).bestItem().getValueOrThrow());
        }
        return this.poiProperties.map((p) => new Gym(p));
    }
}

export class TestGymGenerator extends PoiGeneratorBase<Gym, GymProperties> {
    protected static readonly _singleton = new TestGymGenerator();

    public static generate(specs: string[], zoneNames?: string[], cityNames?: string[]): TestGymData {
        return new TestGymData(TestGymGenerator._singleton.generateInitializer(specs, zoneNames, cityNames));
    }

    public parseProperties(spec: string, zoneNames?: string[], cityNames?: []): GymProperties {
        let isExEligible = false;
        const parts = spec.split('|');
        if (parts.length > 1) {
            switch (parts[1].toLowerCase()) {
                case 'ex':
                    isExEligible = true;
                    break;
                case '':
                case 'nonex':
                    isExEligible = false;
                    break;
                default:
                    throw new Error(`Illegal gym specifier ${spec} - ${parts[1]} should be "ex" or "nonex"`);
            }
        }

        return {
            ...PoiGeneratorBase._parsePoiProperties(spec, zoneNames, cityNames),
            isExEligible,
        };
    }
}

export class TestGymSelector extends PoiGeneratorBase<Gym, GymProperties> {
    protected readonly _gyms: GlobalGymDirectory;

    public constructor(gyms: GlobalGymDirectory) {
        super();
        this._gyms = gyms;
    }

    public generate(specs: string[]): TestGymData {
        const cityNames = Array.from(this._gyms.zones.values()).map((z) => z.name);
        const zoneNames = Array.from(this._gyms.zones.values()).map((z) => z.name);
        const init = this.generateInitializer(specs, zoneNames, cityNames);
        return new TestGymData(init, this._gyms);
    }

    public parseProperties(spec: string, _zoneNames?: string[], _cityNames?: string[]): GymProperties {
        const parts = spec.split('|');
        return this._gyms.lookup(parts[0]).bestItem().getValueOrThrow();
    }
}

export abstract class TestBoss {
    public static readonly bosses: Record<RaidTier, Boss> = {
        1: new Boss({ name: 'Boss 1', tier: 1 }),
        2: new Boss({ name: 'Boss 2', tier: 2 }),
        3: new Boss({ name: 'Boss 3', tier: 3 }),
        4: new Boss({ name: 'Boss 4', tier: 4 }),
        5: new Boss({ name: 'Boss 5', tier: 5 }),
        6: new Boss({ name: 'Boss 6', tier: 6 }),
    };
}

// TestRaid lets us directly access the constructor so that tests
// can do nefarious things that aren't possible from the standard
// implementation.  Also includes a few helper methods.
export class TestRaid extends Raid {
    public static readonly futureOffset = 120;
    public static readonly eggOffset = 30;
    public static readonly hatchedOffset = -15;
    public static readonly expiredOffset = -120;

    public constructor(init: RaidInitializer) {
        super(init);
    }

    public static create(init: RaidInitializer): Result<TestRaid> {
        return captureResult(() => new TestRaid(init));
    }

    public static cloneShifted(base: RaidInitializer): Result<TestRaid> {
        return TestRaid.create({
            gym: base.gym,
            boss: base.boss,
            tier: base.tier,
            raidTimes: new DateRange(
                moment(base.raidTimes.start).add(1, 'minute').toDate(),
                moment(base.raidTimes.end).add(1, 'minute').toDate(),
            ),
        });
    }

    public static getTimes(relativeTo?: Date): Record<RaidState, DateRange> {
        relativeTo = relativeTo ?? new Date();
        return {
            future: TestRaid.getTime('future', relativeTo),
            egg: TestRaid.getTime('egg', relativeTo),
            hatched: TestRaid.getTime('hatched', relativeTo),
            expired: TestRaid.getTime('expired', relativeTo),
        };
    }

    public static getTime(state: RaidState, relativeTo?: Date): DateRange {
        const duration = this.getRaidDuration('normal');
        this.validateRaidState(state).getValueOrThrow();
        switch (state) {
            case 'future':
                return new DateRange(
                    moment(relativeTo).add(this.futureOffset, 'minutes').toDate(),
                    moment(relativeTo).add(this.futureOffset + duration, 'minutes').toDate(),
                );
            case 'egg':
                return new DateRange(
                    moment(relativeTo).add(this.eggOffset, 'minutes').toDate(),
                    moment(relativeTo).add(this.eggOffset + duration, 'minutes').toDate(),
                );
            case 'hatched':
                return new DateRange(
                    moment(relativeTo).add(this.hatchedOffset, 'minutes').toDate(),
                    moment(relativeTo).add(this.hatchedOffset + duration, 'minutes').toDate(),
                );
            case 'expired':
                return new DateRange(
                    moment(relativeTo).add(this.expiredOffset, 'minutes').toDate(),
                    moment(relativeTo).add(this.expiredOffset + duration, 'minutes').toDate(),
                );
        }
    }
}

export interface TestRaidDataProperties {
    state: RaidState;
    tier: RaidTier;
    hasBoss: boolean;
}

export type TestRaidDataInitializer = TestRaidDataProperties|undefined;

export class TestRaidData extends TestGymData {
    public readonly raidInitializers: TestRaidDataInitializer[];
    public get raidGyms(): Gym[] {
        if (this._raidGyms === undefined) {
            this._raidGyms = this.getGyms();
        }
        return this._raidGyms;
    }

    protected _raidGyms?: Gym[];
    protected _raids: TestRaid[];
    protected readonly _bosses: Record<RaidTier, Boss>;

    public constructor(
        gymInit: PoiTestDataInitializer<GymProperties>,
        raidInit: TestRaidDataInitializer[],
        gyms?: GlobalGymDirectory,
        bosses?: Record<RaidTier, Boss>,
    ) {
        super(gymInit, gyms);
        this._bosses = bosses ?? TestBoss.bosses;
        this.raidInitializers = raidInit;
        if (this.raidInitializers.length !== this.poiProperties.length) {
            throw new Error(`TestRaidData has ${this.raidInitializers.length} but ${this.poiProperties.length} gyms.`);
        }
    }

    public getRaidsForGyms(relativeTo?: Date): (TestRaid|undefined)[] {
        if (relativeTo) {
            return this._getRaidsForGyms(relativeTo);
        }
        else if (this._raids === undefined) {
            this._raids = this._getRaidsForGyms();
        }
        return this._raids;
    }

    public getRaids(relativeTo?: Date): Raid[] {
        return this.getRaidsForGyms(relativeTo).filter((r) => r !== undefined);
    }

    public getAsSaveFile(relativeTo?: Date): string {
        return JSON.stringify(this.getRaidsForGyms(relativeTo).map((r) => r.toJson()), undefined, 2);
    }

    private _getRaidsForGyms(relativeTo?: Date): (TestRaid|undefined)[] {
        const times = TestRaid.getTimes(relativeTo);
        const gyms = Array.from(this.raidGyms);
        return this.raidInitializers.map((init) => {
            const gym = gyms.shift();

            if (init === undefined) {
                return undefined;
            }
            const tier = init.tier;
            const raidTimes = times[init.state];
            const boss = (init.hasBoss ? this._bosses[init.tier] : undefined);
            return new TestRaid({ gym, tier, raidTimes, boss });
        });
    }
}

export class TestRaidGenerator {
    public static generate(specs: string[], zoneNames?: string[], cityNames?: string[]): TestRaidData {
        const splitSpecs = specs.map(TestRaidGenerator._splitRaidSpec);
        const gymSpecs = splitSpecs.map((s) => s.gym);
        const raidSpecs = splitSpecs.map((s) => s.raid);
        return new TestRaidData(TestGymGenerator.generate(gymSpecs, zoneNames, cityNames), raidSpecs);
    }

    public static generateForDirectory(specs: string[], gyms: GlobalGymDirectory, bosses?: BossDirectory): TestRaidData {
        const splitSpecs = specs.map(TestRaidGenerator._splitDirectoryRaidSpec);
        const gymSpecs = splitSpecs.map((s) => s.gym);
        const raidSpecs = splitSpecs.map((s) => s.raid);
        const init = new TestGymSelector(gyms).generateInitializer(gymSpecs);
        const testBosses = (bosses ? TestRaidGenerator._getTestBosses(bosses) : undefined);
        return new TestRaidData(init, raidSpecs, gyms, testBosses);
    }

    protected static _getTestBosses(bosses: BossDirectory): Record<RaidTier, Boss> {
        return {
            1: bosses.getAll({ tier: 1 }).best().getValueOrThrow(),
            2: bosses.getAll({ tier: 2 }).best().getValueOrThrow(),
            3: bosses.getAll({ tier: 3 }).best().getValueOrThrow(),
            4: bosses.getAll({ tier: 4 }).best().getValueOrThrow(),
            5: bosses.getAll({ tier: 5 }).best().getValueOrThrow(),
            6: bosses.getAll({ tier: 5 }).best().getValueOrThrow(),
        };
    }

    protected static _splitRaidSpec(spec: string): { gym: string; raid: TestRaidDataInitializer } {
        const parts = spec.split('|');
        if (parts.length <= 2) {
            return { gym: spec, raid: undefined };
        }
        if (parts.length < 4) {
            throw new Error(`Invalid raid test specification ${spec}`);
        }
        const gym = `${parts[0]}|${parts[1]}`;
        const raid: TestRaidDataInitializer = {
            state: Raid.validateRaidState(parts[2]).getValueOrThrow(),
            tier: validateRaidTier(parts[3]).getValueOrThrow(),
            hasBoss: false,
        };

        if (parts.length > 4) {
            const b = parts[4].trim().toLowerCase();
            raid.hasBoss = (b === 'b') || (b === 'boss') || (b === 'true');
        }
        return { gym, raid };
    }

    protected static _splitDirectoryRaidSpec(spec: string): { gym: string; raid: TestRaidDataInitializer } {
        const parts = spec.split('|');
        if (parts.length < 2) {
            return { gym: spec, raid: undefined };
        }
        if (parts.length < 3) {
            throw new Error(`Invalid raid test specification ${spec}`);
        }
        const gym = parts[0];
        const raid: TestRaidDataInitializer = {
            state: Raid.validateRaidState(parts[1]).getValueOrThrow(),
            tier: validateRaidTier(parts[2]).getValueOrThrow(),
            hasBoss: false,
        };

        if (parts.length > 3) {
            const b = parts[3].trim().toLowerCase();
            raid.hasBoss = (b === 'b') || (b === 'boss') || (b === 'true');
        }
        return { gym, raid };
    }
}
