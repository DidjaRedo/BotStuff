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
import '@fgv/ts-utils-jest';
import 'jest-extended';
import {
    Gym,
    Raid,
    RaidJson,
    RaidState,
    RaidType,
} from '../../../src/pogo';
import { TestBoss, TestRaid } from '../../helpers/pogoHelpers';
import {
    loadBossDirectorySync,
    loadGlobalGymDirectorySync,
    raid,
} from '../../../src/pogo/converters';

import { DateRange } from '../../../src/time/dateRange';
import moment from 'moment';

describe('Raid class', () => {
    const gyms = loadGlobalGymDirectorySync('./test/unit/pogo/data/gymObjects.json').getValueOrThrow();
    const bosses = loadBossDirectorySync('./test/unit/pogo/data/validBossDirectory.json').getValueOrThrow();
    const gym = new Gym({
        name: 'Gym',
        city: 'City',
        zones: ['Zone'],
        coord: { latitude: 10, longitude: 20 },
        isExEligible: true,
    });

    describe('protected constructor', () => {
        test('fails to create a raid with a mismatched tier and boss tier', () => {
            const raidTimes = TestRaid.getTime('active');
            const tier = 3;
            const boss = TestBoss.bosses[4];
            expect(TestRaid.create({ tier, gym, raidTimes, boss })).toFailWith(/mismatched tier/i);
        });
    });

    describe('getRaidDuration static method', () => {
        test('returns 45 minutes for normal raids or by default', () => {
            expect(Raid.getRaidDuration('normal')).toBe(45);
            expect(Raid.getRaidDuration()).toBe(45);
        });

        test('returns 60 minutes for raid hour raids', () => {
            expect(Raid.getRaidDuration('raid-hour')).toBe(60);
        });
    });

    describe('getStateFromRaidTimes static method', () => {
        const start = moment().add(120, 'minutes');
        const end = start.clone().add(Raid.getRaidDuration(), 'minutes');
        const range = DateRange.createExplicitDateRange({ start: start.toDate(), end: end.toDate() }).getValueOrThrow();
        test('returns "future" for a raid more than an hour out', () => {
            const wayEarly = start.clone().subtract(120, 'minutes').toDate();
            expect(
                Raid.getStateFromRaidTimes(range, wayEarly)
            ).toSucceedWith('future');
        });

        test('returns "upcoming" for a raid less than an hour out', () => {
            const early = start.clone().subtract(45, 'minutes').toDate();
            expect(
                Raid.getStateFromRaidTimes(range, early)
            ).toSucceedWith('upcoming');
        });

        test('returns "active" for a raid that is in progress', () => {
            const midRaid = start.clone().add(30, 'minutes').toDate();
            expect(
                Raid.getStateFromRaidTimes(range, midRaid)
            ).toSucceedWith('active');
        });

        test('returns "expired" for a raid that has ended', () => {
            const postRaid = end.clone().add(30, 'minutes').toDate();
            expect(
                Raid.getStateFromRaidTimes(range, postRaid)
            ).toSucceedWith('expired');
        });

        test('fails for a raid with an invalid duration', () => {
            const tests: { duration: number; raidType?: RaidType }[] = [
                { duration: 60, raidType: undefined },
                { duration: 45, raidType: 'raid-hour' },
                { duration: 60, raidType: 'normal' },
                { duration: 61, raidType: 'raid-hour' },
            ];

            for (const test of tests) {
                expect(
                    Raid.getStateFromRaidTimes(DateRange.createExplicitDateRange({
                        start: moment().toDate(),
                        end: moment().add(test.duration, 'minutes').toDate(),
                    }).getValueOrThrow(), new Date(), test.raidType)
                ).toFailWith(/invalid raid duration/i);
            }
        });
    });

    describe('createFutureRaid static method', () => {
        describe('with a timer', () => {
            test('succeeds for a valid timer', () => {
                const timer = 30;
                const tier = 5;
                expect(
                    Raid.createFutureRaid(timer, gym, tier)
                ).toSucceedAndSatisfy((raid: Raid) => {
                    expect(raid.gymName).toBe(gym.name);
                    expect(raid.tier).toBe(tier);
                    expect(raid.raidTimes.timeUntil('start', new Date())).toBeWithin(timer - 1, timer + 1);
                    expect(raid.raidTimes.duration()).toBe(45);
                    expect(raid.state).toEqual('upcoming');
                });
            });

            test('creates a 60 minute raid for raid hour', () => {
                const timer = 30;
                const tier = 5;
                expect(
                    Raid.createFutureRaid(timer, gym, tier, 'raid-hour')
                ).toSucceedAndSatisfy((raid: Raid) => {
                    expect(raid.gymName).toBe(gym.name);
                    expect(raid.tier).toBe(tier);
                    expect(raid.raidTimes.timeUntil('start', new Date())).toBeWithin(timer - 1, timer + 1);
                    expect(raid.raidTimes.duration()).toBe(60);
                });
            });

            test('fails for an undefined gym', () => {
                expect(
                    Raid.createFutureRaid(30, undefined, 5, 'raid-hour')
                ).toFailWith(/gym must be specified/i);
            });

            test('fails for an invalid timer', () => {
                expect(
                    Raid.createFutureRaid(120, gym, 5)
                ).toFailWith(/egg timer.*out of range/i);
            });
        });

        describe('with a start time', () => {
            test('succeeds for a valid start time', () => {
                const tier = 5;
                const start = moment().add(30, 'minutes').toDate();
                expect(
                    Raid.createFutureRaid(start, gym, tier)
                ).toSucceedAndSatisfy((raid: Raid) => {
                    expect(raid.gymName).toBe(gym.name);
                    expect(raid.bossName).toBe('undefined');
                    expect(raid.tier).toBe(tier);
                    expect(raid.hatchTime).toEqual(start);
                    expect(raid.raidTimes.duration()).toBe(45);
                    expect(raid.state).toEqual('upcoming');
                });
            });

            test('fails for a start time too far in the future', () => {
                const start = moment().add(120, 'minutes').toDate();
                expect(
                    Raid.createFutureRaid(start, gym, 5)
                ).toFailWith(/too far in the future/i);
            });

            test('fails for a start time in the past', () => {
                const start = moment().subtract(10, 'minutes').toDate();
                expect(
                    Raid.createFutureRaid(start, gym, 5)
                ).toFailWith(/in the past/i);
            });
        });
    });

    describe('createActiveRaid static method', () => {
        test('succeeds for a timer less than 45 minutes', () => {
            const timeLeft = 30;
            const boss = TestBoss.bosses[5];
            expect(
                Raid.createActiveRaid(timeLeft, gym, boss)
            ).toSucceedAndSatisfy((raid: Raid) => {
                expect(raid.gymName).toBe(gym.name);
                expect(raid.bossName).toBe(boss.displayName);
                expect(raid.boss).toBe(boss);
                expect(raid.tier).toBe(boss.tier);
                expect(raid.raidTimes.timeUntil('end', new Date())).toBeWithin(timeLeft - 1, timeLeft);
                expect(raid.raidTimes.duration()).toBe(45);
                expect(raid.state).toEqual('active');
            });
        });

        test('succeeds for a raid-hour timer less than 60 minutes', () => {
            const boss = TestBoss.bosses[4];
            const timeLeft = 55;
            expect(
                Raid.createActiveRaid(timeLeft, gym, boss, 'raid-hour')
            ).toSucceedAndSatisfy((raid: Raid) => {
                expect(raid.gymName).toBe(gym.name);
                expect(raid.bossName).toBe(boss.displayName);
                expect(raid.boss).toBe(boss);
                expect(raid.tier).toBe(boss.tier);
                expect(moment(raid.expiryTime).diff(moment(), 'minutes')).toBeWithin(timeLeft - 1, timeLeft);
                expect(raid.raidTimes.duration()).toBe(60);
                expect(raid.state).toEqual('active');
            });
        });

        test('fails if gym or boss is undefined', () => {
            expect(
                Raid.createActiveRaid(30, undefined, TestBoss.bosses[5])
            ).toFailWith(/gym must be specified/i);

            expect(
                Raid.createActiveRaid(30, gym, undefined)
            ).toFailWith(/boss must be specified/i);
        });

        test('fails for a normal raid greater than 45 minutes', () => {
            expect(
                Raid.createActiveRaid(55, gym, TestBoss.bosses[3])
            ).toFailWith(/raid timer.*out of range/i);
        });

        test('fails for a raid-hour raid greater than 60 minutes', () => {
            expect(
                Raid.createActiveRaid(65, gym, TestBoss.bosses[2], 'raid-hour')
            ).toFailWith(/raid timer.*out of range/i);
        });
    });

    describe('createFromJson method', () => {
        test('succeeds for valid json objects, ignoring extra fields', () => {
            [
                {
                    hatch: moment().toISOString(),
                    gym: 'northstarpark',
                    boss: 'lugiat5',
                    tier: 5,
                    type: 'normal',
                },
                {
                    hatch: moment().toISOString(),
                    gym: 'northstarpark',
                    boss: 'lugiat5',
                    type: 'normal',
                    expectedTier: 5,
                },
                {
                    hatch: moment().add(10, 'minutes').toISOString(),
                    gym: 'northstarpark',
                    tier: 5,
                    type: 'raid-hour',
                    extra: 'bogus extra field',
                },
            ].forEach((test) => {
                expect(Raid.createFromJson(test as RaidJson, gyms, bosses)).toSucceedWith(
                    expect.objectContaining({
                        tier: test.tier ?? test.expectedTier,
                        gym: expect.objectContaining({
                            primaryKey: test.gym,
                        }),
                    })
                );
            });
        });

        test('fails for invalid json objects', () => {
            [
                {
                    src: {
                        hatch: moment().toISOString(),
                        gym: 'northstarpark',
                        boss: 'lugiat5',
                        tier: 4,
                        type: 'normal',
                    },
                    expected: /mismatched tier/i,
                },
                {
                    src: {
                        hatch: moment().toISOString(),
                        gym: 'northstarpark',
                        boss: 'giratina',
                        tier: 5,
                        type: 'normal',
                    },
                    expected: /giratina matches 2 items/i,
                },
                {
                    src: {
                        hatch: moment().toISOString(),
                        gym: 'northstarpark',
                        boss: 'lugialicious',
                        tier: 5,
                        type: 'normal',
                    },
                    expected: /lugialicious not found/i,
                },
                {
                    src: {
                        hatch: moment().add(10, 'minutes').toISOString(),
                        gym: 'notagym',
                        tier: 5,
                        type: 'raid-hour',
                    },
                    expected: /notagym not found/i,
                },
                {
                    src: {
                        hatch: moment().add(10, 'minutes').toISOString(),
                        gym: 'northstarpark',
                        tier: 10,
                        type: 'normal',
                    },
                    expected: /invalid raid tier/i,
                },
                {
                    src: {
                        hatch: moment().add(10, 'minutes').toISOString(),
                        gym: 'northstarpark',
                        tier: 2,
                        type: 'abnormal',
                    },
                    expected: /invalid raid type/i,
                },
                {
                    src: {
                        hatch: moment().add(10, 'minutes').toISOString(),
                        gym: 'northstarpark',
                        tier: 2,
                        type: 7,
                    },
                    expected: /invalid raid type/i,
                },
            ].forEach((test) => {
                expect(Raid.createFromJson(test.src as RaidJson, gyms, bosses))
                    .toFailWith(test.expected);
            });
        });
    });

    describe('compare method', () => {
        const northstar = gyms.lookup('northstarpark').singleItem().getValueOrThrow();
        const prescott = gyms.lookup('prescott').singleItem().getValueOrThrow();

        test('sorts by time', () => {
            const first = Raid.createFutureRaid(10, prescott, 5).getValueOrThrow();
            const second = Raid.createFutureRaid(20, northstar, 5).getValueOrThrow();
            expect(Raid.compare(first, second)).toBe(-1);
            expect(Raid.compare(second, first)).toBe(1);
        });

        test('sorts alphabetically by name if times are the same', () => {
            const start = moment().add(10, 'minutes').toDate();
            const first = Raid.createFutureRaid(start, northstar, 5).getValueOrThrow();
            const second = Raid.createFutureRaid(start, prescott, 5).getValueOrThrow();
            expect(Raid.compare(first, second)).toBe(-1);
            expect(Raid.compare(second, first)).toBe(1);
        });

        test('considers raids equal if name and time match', () => {
            const start = moment().add(10, 'minutes').toDate();
            const first = Raid.createFutureRaid(start, northstar, 5).getValueOrThrow();
            const second = Raid.createFutureRaid(start, northstar, 5).getValueOrThrow();
            expect(Raid.compare(first, second)).toBe(0);
            expect(Raid.compare(second, first)).toBe(0);
        });
    });

    describe('update method', () => {
        test('updates the tier of a raid in any state with no boss', () => {
            const states: RaidState[] = ['future', 'upcoming', 'active', 'expired'];
            for (const state of states) {
                const raid = new TestRaid({
                    tier: 1,
                    gym: gym,
                    raidTimes: TestRaid.getTime(state),
                });
                expect(raid.state).toBe(state);
                expect(raid.update(2)).toSucceedWith(1);
            }
        });

        test('fails to update the tier of a raid that already has a boss', () => {
            const states: RaidState[] = ['active', 'expired'];
            for (const state of states) {
                const raidTimes = TestRaid.getTime(state);
                const tier = 5;
                const raid = new TestRaid({ tier, gym, raidTimes, boss: TestBoss.bosses[tier] });
                expect(raid.state).toBe(state);
                expect(raid.update(1)).toFailWith(/cannot change tier/i);
            }
        });

        test('adds or updates a boss for an active or expired raid', () => {
            const states: RaidState[] = ['active', 'expired'];
            for (const state of states) {
                const raidTimes = TestRaid.getTime(state);
                const tier = 4;
                const raid = new TestRaid({ tier, gym, raidTimes });
                expect(raid.state).toBe(state);
                expect(raid.update(TestBoss.bosses[tier])).toSucceedWith(undefined);
                expect(raid.boss).toBe(TestBoss.bosses[tier]);
                expect(raid.tier).toBe(tier);

                const newTier = 3;
                expect(raid.update(TestBoss.bosses[newTier])).toSucceedWith(TestBoss.bosses[tier]);
                expect(raid.boss).toBe(TestBoss.bosses[newTier]);
                expect(raid.tier).toBe(newTier);
            }
        });

        test('fails to add a boss for a raid in the future', () => {
            const states: RaidState[] = ['future', 'upcoming'];
            for (const state of states) {
                const raidTimes = TestRaid.getTime(state);
                const tier = 3;
                const raid = new TestRaid({ tier, gym, raidTimes });
                expect(raid.state).toBe(state);
                expect(raid.update(TestBoss.bosses[tier])).toFailWith(/cannot assign.*future raid/i);
            }
        });
    });

    describe('refreshState', () => {
        test('updates to the correct state for a supplied or current time', () => {
            const states: RaidState[] = ['future', 'upcoming', 'active', 'expired'];
            for (const state of states) {
                const raidTimes = TestRaid.getTime(state);
                const midPoint = moment(raidTimes.start).add(20, 'minutes').toDate();
                const tier = 4;
                const raid = new TestRaid({ tier, gym, raidTimes });
                expect(raid.state).toBe(state);
                expect(raid.refreshState(midPoint)).toSucceedWith(state);
                expect(raid.state).toBe('active');
                expect(raid.refreshState()).toSucceedWith('active');
                expect(raid.state).toBe(state);
            }
        });
    });

    describe('getDirectoryOptions static method', () => {
        test('searches by name and gym name name and index by unique alternate names', (): void => {
            expect(Raid.getDirectoryOptions()).toMatchObject({
                textSearchKeys: [
                    { name: 'name' },
                    { name: 'gymName' },
                ],
                alternateKeys: ['gymName'],
                enforceAlternateKeyUniqueness: ['name', 'gymName'],
            });
        });
    });

    describe('isValidRaidState static method', () => {
        test('returns true for exact string matches for a valid raid state', () => {
            for (const state of ['future', 'upcoming', 'active', 'expired']) {
                expect(Raid.isValidRaidState(state)).toBe(true);
            }
        });

        test('returns false for anything other than an exact string match for a valid raid state', () => {
            for (const state of ['Future', ' upcoming', 'whatever']) {
                expect(Raid.isValidRaidState(state)).toBe(false);
            }
        });
    });

    describe('validateRaidState static method', () => {
        test('returns a valid raid state for a matching string (normalized and trimmed)', () => {
            const tests: { tests: string[]; expected: RaidState }[] = [
                { tests: ['future', 'Future', '  futURE '], expected: 'future' },
                { tests: ['upcoming', 'UPCOMING', ' Upcoming'], expected: 'upcoming' },
                { tests: ['active', ' active ', 'ACTIVE'], expected: 'active' },
                { tests: ['expired', 'Expired ', 'eXpired'], expected: 'expired' },
            ];

            for (const test of tests) {
                for (const state of test.tests) {
                    expect(Raid.validateRaidState(state)).toSucceedWith(test.expected);
                }
            }
        });

        test('fails for anything else', () => {
            for (const state of ['Hutched', '_egg', 0, 7, true, () => 'active']) {
                expect(Raid.validateRaidState(state)).toFailWith(/invalid raid state/i);
            }
        });
    });

    describe('toString method', () => {
        test('matches the primaryKey', () => {
            expect(Raid.createFutureRaid(10, gym, 5))
                .toSucceedAndSatisfy<Raid>((raid) => {
                    expect(raid.toString()).toEqual(raid.primaryKey);
                });
        });
    });

    describe('toJson method', () => {
        test('converts a raid to valid json', () => {
            const tier = 4;
            const start = moment().add(10, 'minutes').toDate();
            const raid = Raid.createFutureRaid(start, gym, tier).getValueOrThrow();
            expect(raid.toJson()).toEqual(
                expect.objectContaining({
                    boss: undefined,
                    gym: gym.primaryKey,
                    hatch: start.toISOString(),
                    tier: tier,
                    type: 'normal',
                }),
            );
        });

        test('includes the boss if present', () => {
            const boss = TestBoss.bosses[5];
            const raid = Raid.createActiveRaid(20, gym, boss).getValueOrThrow();
            expect(raid.toJson()).toEqual(
                expect.objectContaining({
                    boss: boss.primaryKey,
                    gym: gym.primaryKey,
                    hatch: raid.raidTimes.start.toISOString(),
                    tier: boss.tier,
                    type: 'normal',
                }),
            );
        });
    });

    describe('toArray method', () => {
        test('includes the boss for any raid with a boss', () => {
            const tier = 4;
            const raid = Raid.createActiveRaid(20, gym, TestBoss.bosses[tier]).getValueOrThrow();
            expect(raid.toArray()).toEqual([
                raid.raidTimes.start.toISOString(),
                gym.primaryKey,
                TestBoss.bosses[tier].primaryKey,
                raid.raidType,
            ]);
        });

        test('includes tier for any raid without a boss', () => {
            const start = moment().add(10, 'minutes').toDate();
            const tier = 3;
            const raid = Raid.createFutureRaid(start, gym, tier).getValueOrThrow();
            expect(raid.toArray()).toEqual([
                start.toISOString(),
                gym.primaryKey,
                tier,
                raid.raidType,
            ]);
        });
    });

    describe('converters', () => {
        describe('raid converter', () => {
            test('converts valid raid arrays or objects with or without bosses', () => {
                const past = moment().subtract(20, 'minutes').toDate();
                const future = moment().add(20, 'minutes').toDate();
                const gym = gyms.lookupExact('northstarpark').single().getValueOrThrow().item;
                const boss = bosses.lookup('lugiat5').single().getValueOrThrow().item;
                const tests = [
                    {
                        src: [past.toISOString(), gym.primaryKey, boss.primaryKey, 'normal'],
                        expected: expect.objectContaining({
                            tier: 5,
                            gym: gym,
                            boss: boss,
                            raidTimes: expect.objectContaining({
                                min: past,
                            }),
                            raidType: 'normal',
                        }),
                    },
                    {
                        src: [future.toISOString(), gym.primaryKey, 4, 'raid-hour'],
                        expected: expect.objectContaining({
                            tier: 4,
                            gym: gym,
                            boss: undefined,
                            raidTimes: expect.objectContaining({
                                min: future,
                            }),
                            raidType: 'raid-hour',
                        }),
                    },
                    {
                        src: {
                            gym: gym.primaryKey,
                            boss: boss.primaryKey,
                            hatch: past.toISOString(),
                            type: 'raid-hour',
                        },
                        expected: expect.objectContaining({
                            tier: 5,
                            gym: gym,
                            boss: boss,
                            raidTimes: expect.objectContaining({
                                min: past,
                            }),
                            raidType: 'raid-hour',
                        }),
                    },
                ];

                for (const test of tests) {
                    expect(
                        raid(gyms, bosses).convert(test.src)
                    ).toSucceedWith(test.expected);
                }
            });

            test('fails for an invalid array or object', () => {
                const past = moment().subtract(20, 'minutes').toDate();
                const future = moment().add(20, 'minutes').toDate();
                const tests = [
                    {
                        src: [past.toISOString(), 'northstarpark', 'lugiat5', 'normal', 'extra'],
                        expected: /invalid raid properties/i,
                    },
                    {
                        src: [future.toISOString(), 'northstarpark', true, 'raid-hour'],
                        expected: /invalid raid tier/i,
                    },
                    {
                        src: {
                            gym: 'northstarpark',
                            boss: 'lugiat5',
                            hatch: past.toISOString(),
                            type: 'normal',
                            tier: 11,
                        },
                        expected: /invalid raid tier/i,
                    },
                ];

                for (const test of tests) {
                    expect(
                        raid(gyms, bosses).convert(test.src)
                    ).toFailWith(test.expected);
                }
            });
        });
    });
});
