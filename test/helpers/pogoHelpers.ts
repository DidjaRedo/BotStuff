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
    DEFAULT_BOSSES_FILE,
    DEFAULT_GYMS_FILE,
    DEFAULT_SAVE_FILE,
    RaidManager,
    RaidManagerListener,
    RaidManagerOptions,
} from '../../src/pogo/raidManager';
import { DateRange, ExplicitDateRange } from '../../src/time/dateRange';
import { Gym, GymProperties } from '../../src/pogo/gym';
import { PoiGeneratorBase, PoiTestDataBase, PoiTestDataInitializer } from './placeHelpers';
import { Raid, RaidInitializer, RaidState } from '../../src/pogo/raid';
import { RaidTier, validateRaidTier } from '../../src/pogo/game';
import { Result, captureResult, succeed } from '@fgv/ts-utils';
import { Boss } from '../../src/pogo/boss';
import { BossDirectory } from '../../src/pogo/bossDirectory';
import { GlobalGymDirectory } from '../../src/pogo/gymDirectory';
import { InMemoryLogger } from '@fgv/ts-utils/logger';
import { MockFileSystem } from './dataHelpers';
import { RaidMap } from '../../src/pogo/raidMap';
import { loadBossDirectorySync } from '../../src/pogo/converters/bossConverters';
import { loadGlobalGymDirectorySync } from '../../src/pogo/converters/gymConverters';
import moment from 'moment';

export class TestGymData extends PoiTestDataBase<GymProperties> {
    protected readonly _gyms?: GlobalGymDirectory;

    public constructor(init: PoiTestDataInitializer<GymProperties>, gyms?: GlobalGymDirectory) {
        super(init);
        this._gyms = gyms;
    }

    public getGyms(): Gym[] {
        const gyms = this._gyms;
        if (gyms !== undefined) {
            return this.poiProperties.map((p) => gyms.lookup(p.name).firstItem().getValueOrThrow());
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
            ...PoiGeneratorBase._parsePoiProperties(spec, zoneNames ?? [], cityNames ?? []),
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
        return this._gyms.lookup(parts[0]).firstItem().getValueOrThrow();
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
            raidTimes: DateRange.createExplicitDateRange({
                start: moment(base.raidTimes.start).add(1, 'minute').toDate(),
                end: moment(base.raidTimes.end).add(1, 'minute').toDate(),
            }).getValueOrThrow(),
        });
    }

    public static getTimes(relativeTo?: Date): Record<RaidState, ExplicitDateRange> {
        relativeTo = relativeTo ?? new Date();
        return {
            future: TestRaid.getTime('future', relativeTo),
            upcoming: TestRaid.getTime('upcoming', relativeTo),
            active: TestRaid.getTime('active', relativeTo),
            expired: TestRaid.getTime('expired', relativeTo),
        };
    }

    public static getStartTime(state: RaidState, relativeTo?: Date): Date {
        this.validateRaidState(state).getValueOrThrow();
        switch (state) {
            case 'future':
                return moment(relativeTo).add(this.futureOffset, 'minutes').toDate();
            case 'upcoming':
                return moment(relativeTo).add(this.eggOffset, 'minutes').toDate();
            case 'active':
                return moment(relativeTo).add(this.hatchedOffset, 'minutes').toDate();
            case 'expired':
                return moment(relativeTo).add(this.expiredOffset, 'minutes').toDate();
        }
    }

    public static getTime(state: RaidState, relativeTo?: Date): ExplicitDateRange {
        const start = TestRaid.getStartTime(state, relativeTo);
        const duration = this.getRaidDuration('normal');
        return DateRange.createExplicitDateRange({ start, end: moment(start).add(duration, 'minutes').toDate() }).getValueOrThrow();
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
    protected _raids?: TestRaid[];
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
            this._raids = this._getRaidsForGyms().filter((r): r is TestRaid => r !== undefined);
        }
        return this._raids;
    }

    public getRaids(relativeTo?: Date): Raid[] {
        return this.getRaidsForGyms(relativeTo).filter((r): r is TestRaid => r !== undefined);
    }

    public getAsSaveFile(relativeTo?: Date): string {
        return JSON.stringify(this.getRaidsForGyms(relativeTo).map((r) => r?.toJson()), undefined, 2);
    }

    private _getRaidsForGyms(relativeTo?: Date): (TestRaid|undefined)[] {
        const times = TestRaid.getTimes(relativeTo);
        const gyms = Array.from(this.raidGyms);
        return this.raidInitializers.map((init) => {
            const gym = gyms.shift();

            if ((init === undefined) || (gym === undefined)) {
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
            1: bosses.getAll({ tier: 1 }).first().getValueOrThrow(),
            2: bosses.getAll({ tier: 2 }).first().getValueOrThrow(),
            3: bosses.getAll({ tier: 3 }).first().getValueOrThrow(),
            4: bosses.getAll({ tier: 4 }).first().getValueOrThrow(),
            5: bosses.getAll({ tier: 5 }).first().getValueOrThrow(),
            6: bosses.getAll({ tier: 5 }).first().getValueOrThrow(),
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

export class TestRaidManager extends RaidManager {
    public static readonly gyms = loadGlobalGymDirectorySync('./test/unit/pogo/data/gymArrays.json').getValueOrThrow();
    public static readonly bosses = loadBossDirectorySync('./test/unit/pogo/data/validBossDirectory.json').getValueOrThrow();
    public static readonly mockFs: MockFileSystem = new MockFileSystem([
        {
            path: DEFAULT_GYMS_FILE,
            backingFile: 'test/unit/pogo/data/gymArrays.json',
            writable: false,
        },
        {
            path: DEFAULT_BOSSES_FILE,
            backingFile: 'test/unit/pogo/data/validBossDirectory.json',
            writable: false,
        },
        {
            path: DEFAULT_SAVE_FILE,
            writable: true,
        },
    ]);

    public constructor(options?: RaidManagerOptions) {
        super({ autoSave: false, autoStart: false, ...(options ?? {}) });
    }

    public static setup(raids: string[], options?: Partial<RaidManagerOptions>, relativeTo?: Date): RaidManagerTestData {
        const testData = TestRaidGenerator.generateForDirectory(raids, TestRaidManager.gyms, TestRaidManager.bosses);
        const logger = new InMemoryLogger();
        const saveData = testData.getAsSaveFile(relativeTo);

        TestRaidManager.mockFs.reset();
        const spies = TestRaidManager.mockFs.startSpies();

        // we do it this way to bypass the refresh on the normal restore,
        // which would automatically process expired or hatched raids. Since
        // this is a test instrument we want to end up with exactly the requested
        // contents.
        const rm = new TestRaidManager({ autoSave: false, autoStart: false, logger, ...(options ?? {}) });
        TestRaidManager.mockFs.writeMockFileSync(DEFAULT_SAVE_FILE, saveData);
        rm.restore().getValueOrThrow();

        spies.restore();
        TestRaidManager.mockFs.reset();
        logger.clear();
        return { testData, logger, rm };
    }

    public restore(): Result<RaidMap> {
        return this._restore().onSuccess((rm) => {
            this._raids = rm;
            return succeed(rm);
        });
    }

    public add(raid: Raid): Result<Raid> {
        return this._raids.addOrUpdate(raid);
    }
}

export class TestListener implements RaidManagerListener {
    public raidUpdated = jest.fn();
    public raidListUpdated = jest.fn();
    public reset(): void {
        this.raidListUpdated.mockClear();
        this.raidUpdated.mockClear();
    }
}

export type RaidManagerTestData = { testData: TestRaidData, logger: InMemoryLogger, rm: TestRaidManager };

