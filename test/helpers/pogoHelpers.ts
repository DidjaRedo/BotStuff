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
import { DateRange } from '../../src/time/dateRange';
import moment from 'moment';

export class TestGymData extends PoiTestDataBase<GymProperties> {
    public getGyms(): Gym[] {
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

// TestRaid just lets us directly access the constructor so that tests
// can do nefarious things that aren't possible from the standard
// impmentation.
export class TestRaid extends Raid {
    public static times: Record<RaidState, DateRange> = {
        future: new DateRange(
            moment().add(120, 'minutes').toDate(),
            moment().add(165, 'minutes').toDate(),
        ),
        egg: new DateRange(
            moment().add(30, 'minutes').toDate(),
            moment().add(75, 'minutes').toDate(),
        ),
        hatched: new DateRange(
            moment().subtract(15, 'minutes').toDate(),
            moment().add(30, 'minutes').toDate(),
        ),
        expired: new DateRange(
            moment().subtract(120, 'minutes').toDate(),
            moment().subtract(75, 'minutes').toDate(),
        ),
    };

    public constructor(init: RaidInitializer) {
        super(init);
    }

    public static create(init: RaidInitializer): Result<TestRaid> {
        return captureResult(() => new TestRaid(init));
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

    public constructor(gymInit: PoiTestDataInitializer<GymProperties>, raidInit: TestRaidDataInitializer[]) {
        super(gymInit);
        this.raidInitializers = raidInit;
        if (this.raidInitializers.length !== this.poiProperties.length) {
            throw new Error(`TestRaidData has ${this.raidInitializers.length} but ${this.poiProperties.length} gyms.`);
        }
    }

    public getRaids(): (Raid|undefined)[] {
        const gyms = Array.from(this.raidGyms);
        const raids = this.raidInitializers.map((init) => {
            const gym = gyms.shift();

            if (init === undefined) {
                return undefined;
            }
            const tier = init.tier;
            const raidTimes = TestRaid.times[init.state];
            const boss = (init.hasBoss ? TestBoss.bosses[init.tier] : undefined);
            return new TestRaid({ gym, tier, raidTimes, boss });
        });
        return raids;
    }

    public getActualRaids(): Raid[] {
        return this.getRaids().filter((r) => r !== undefined);
    }
}


export class TestRaidGenerator {
    public static generate(specs: string[], zoneNames?: string[], cityNames?: string[]): TestRaidData {
        const splitSpecs = specs.map(TestRaidGenerator._splitRaidSpec);
        const gymSpecs = splitSpecs.map((s) => s.gym);
        const raidSpecs = splitSpecs.map((s) => s.raid);
        return new TestRaidData(TestGymGenerator.generate(gymSpecs, zoneNames, cityNames), raidSpecs);
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
}
