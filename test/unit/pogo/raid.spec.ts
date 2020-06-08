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
import '../../helpers/jestHelpers';
import { Raid, RaidState, RaidType } from '../../../src/pogo/raid';
import { TestBoss, TestRaid } from '../../helpers/pogoHelpers';
import { DateRange } from '../../../src/time/dateRange';
import { Gym } from '../../../src/pogo/gym';
import moment from 'moment';

describe('Raid class', () => {
    const gym = new Gym({
        name: 'Gym',
        city: 'City',
        zones: ['Zone'],
        coord: { latitude: 10, longitude: 20 },
        isExEligible: true,
    });

    describe('protected constructor', () => {
        it('should fail to create a raid with a mismatched tier and boss tier', () => {
            const raidTimes = TestRaid.times.hatched;
            const tier = 3;
            const boss = TestBoss.bosses[4];
            expect(TestRaid.create({ tier, gym, raidTimes, boss })).toFailWith(/mismatched tier/i);
        });
    });

    describe('getRaidDuration static method', () => {
        it('should return 45 minutes for normal raids or by default', () => {
            expect(Raid.getRaidDuration('normal')).toBe(45);
            expect(Raid.getRaidDuration()).toBe(45);
        });

        it('should return 60 minutes for raid hour raids', () => {
            expect(Raid.getRaidDuration('raid-hour')).toBe(60);
        });
    });

    describe('getStateFromRaidTimes static method', () => {
        const start = moment().add(120, 'minutes');
        const end = start.clone().add(Raid.getRaidDuration(), 'minutes');
        const range = new DateRange(start.toDate(), end.toDate());
        it('should return "future" for a raid more than an hour out', () => {
            const wayEarly = start.clone().subtract(120, 'minutes').toDate();
            expect(
                Raid.getStateFromRaidTimes(range, wayEarly)
            ).toSucceedWith('future');
        });

        it('should return "egg" for a raid less than an hour out', () => {
            const early = start.clone().subtract(45, 'minutes').toDate();
            expect(
                Raid.getStateFromRaidTimes(range, early)
            ).toSucceedWith('egg');
        });

        it('should return "hatched" for a raid that is in progress', () => {
            const midRaid = start.clone().add(30, 'minutes').toDate();
            expect(
                Raid.getStateFromRaidTimes(range, midRaid)
            ).toSucceedWith('hatched');
        });

        it('should return "expired" for a raid that has ended', () => {
            const postRaid = end.clone().add(30, 'minutes').toDate();
            expect(
                Raid.getStateFromRaidTimes(range, postRaid)
            ).toSucceedWith('expired');
        });

        it('should fail for a raid with an invalid duration', () => {
            const tests: { duration: number; raidType?: RaidType }[] = [
                { duration: 60, raidType: undefined },
                { duration: 45, raidType: 'raid-hour' },
                { duration: 60, raidType: 'normal' },
                { duration: 61, raidType: 'raid-hour' },
            ];

            for (const test of tests) {
                expect(
                    Raid.getStateFromRaidTimes(new DateRange(
                        moment().toDate(),
                        moment().add(test.duration, 'minutes').toDate(),
                    ), new Date(), test.raidType)
                ).toFailWith(/invalid raid duration/i);
            }
        });
        it('should fail for a raid with an open-ended range', () => {
            [
                [new Date(), undefined],
                [undefined, new Date()],
            ].forEach((test) => {
                const range = new DateRange(test[0], test[1]);
                expect(Raid.getStateFromRaidTimes(range)).toFailWith(/both start and end/i);
            });
        });
    });

    describe('createFutureRaid static method', () => {
        describe('with a timer', () => {
            it('should succeed for a valid timer', () => {
                const timer = 30;
                const tier = 5;
                expect(
                    Raid.createFutureRaid(timer, gym, tier)
                ).toSucceedWithCallback((raid: Raid) => {
                    expect(raid.gymName).toBe(gym.name);
                    expect(raid.tier).toBe(tier);
                    expect(raid.raidTimes.timeUntil('start', new Date())).toBeInRange(timer - 1, timer);
                    expect(raid.raidTimes.duration()).toBe(45);
                    expect(raid.state).toEqual('egg');
                });
            });

            it('should create a 60 minute raid for raid hour', () => {
                const timer = 30;
                const tier = 5;
                expect(
                    Raid.createFutureRaid(timer, gym, tier, 'raid-hour')
                ).toSucceedWithCallback((raid: Raid) => {
                    expect(raid.gymName).toBe(gym.name);
                    expect(raid.tier).toBe(tier);
                    expect(raid.raidTimes.timeUntil('start', new Date())).toBeInRange(timer - 1, timer);
                    expect(raid.raidTimes.duration()).toBe(60);
                });
            });

            it('should fail for an invalid timer', () => {
                expect(
                    Raid.createFutureRaid(120, gym, 5)
                ).toFailWith(/egg timer.*out of range/i);
            });
        });

        describe('with a start time', () => {
            it('should succeed for a valid start time', () => {
                const tier = 5;
                const start = moment().add(30, 'minutes').toDate();
                expect(
                    Raid.createFutureRaid(start, gym, tier)
                ).toSucceedWithCallback((raid: Raid) => {
                    expect(raid.gymName).toBe(gym.name);
                    expect(raid.tier).toBe(tier);
                    expect(raid.hatchTime).toEqual(start);
                    expect(raid.raidTimes.duration()).toBe(45);
                    expect(raid.state).toEqual('egg');
                });
            });

            it('should fail for a start time too far in the future', () => {
                const start = moment().add(120, 'minutes').toDate();
                expect(
                    Raid.createFutureRaid(start, gym, 5)
                ).toFailWith(/too far in the future/i);
            });

            it('should fail for a start time in the past', () => {
                const start = moment().subtract(10, 'minutes').toDate();
                expect(
                    Raid.createFutureRaid(start, gym, 5)
                ).toFailWith(/in the past/i);
            });
        });
    });

    describe('createActive static method', () => {
        it('should succeed for a timer less than 45 minutes', () => {
            const timeLeft = 30;
            const boss = TestBoss.bosses[5];
            expect(
                Raid.createActiveRaid(timeLeft, gym, boss)
            ).toSucceedWithCallback((raid: Raid) => {
                expect(raid.gymName).toBe(gym.name);
                expect(raid.boss).toBe(boss);
                expect(raid.tier).toBe(boss.tier);
                expect(raid.raidTimes.timeUntil('end', new Date())).toBeInRange(timeLeft - 1, timeLeft);
                expect(raid.raidTimes.duration()).toBe(45);
                expect(raid.state).toEqual('hatched');
            });
        });

        it('should succeed for a raid-hour timer les than 60 minutes', () => {
            const boss = TestBoss.bosses[4];
            const timeLeft = 55;
            expect(
                Raid.createActiveRaid(timeLeft, gym, boss, 'raid-hour')
            ).toSucceedWithCallback((raid: Raid) => {
                expect(raid.gymName).toBe(gym.name);
                expect(raid.boss).toBe(boss);
                expect(raid.tier).toBe(boss.tier);
                expect(moment(raid.expiryTime).diff(moment(), 'minutes')).toBeInRange(timeLeft - 1, timeLeft);
                expect(raid.raidTimes.duration()).toBe(60);
                expect(raid.state).toEqual('hatched');
            });
        });

        it('should fail for a normal raid greater than 45 minutes', () => {
            expect(
                Raid.createActiveRaid(55, gym, TestBoss.bosses[3])
            ).toFailWith(/raid timer.*out of range/i);
        });

        it('should fail for a raid-hour raid greater than 60 minutes', () => {
            expect(
                Raid.createActiveRaid(65, gym, TestBoss.bosses[2], 'raid-hour')
            ).toFailWith(/raid timer.*out of range/i);
        });
    });

    describe('update method', () => {
        it('should update the tier of a raid in any state with no boss', () => {
            for (const state of ['future', 'egg', 'hatched', 'expired']) {
                const raid = new TestRaid({
                    tier: 1,
                    gym: gym,
                    raidTimes: TestRaid.times[state],
                });
                expect(raid.state).toBe(state);
                expect(raid.update(2)).toSucceedWith(1);
            }
        });

        it('should fail to update the tier of a raid that already has a boss', () => {
            for (const state of ['hatched', 'expired']) {
                const raidTimes = TestRaid.times[state];
                const tier = 5;
                const raid = new TestRaid({ tier, gym, raidTimes, boss: TestBoss.bosses[tier] });
                expect(raid.state).toBe(state);
                expect(raid.update(1)).toFailWith(/cannot change tier/i);
            }
        });

        it('should add or update a boss for a hatched or expired raid', () => {
            for (const state of ['hatched', 'expired']) {
                const raidTimes = TestRaid.times[state];
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

        it('should fail to add a boss for a raid in the future', () => {
            for (const state of ['future', 'egg']) {
                const raidTimes = TestRaid.times[state];
                const tier = 3;
                const raid = new TestRaid({ tier, gym, raidTimes });
                expect(raid.state).toBe(state);
                expect(raid.update(TestBoss.bosses[tier])).toFailWith(/cannot assign.*future raid/i);
            }
        });
    });

    describe('refreshState', () => {
        it('should update to the correct state for a supplied or current time', () => {
            for (const state of ['future', 'egg', 'hatched', 'expired']) {
                const raidTimes = TestRaid.times[state];
                const midPoint = moment(raidTimes.start).add(20, 'minutes').toDate();
                const tier = 4;
                const raid = new TestRaid({ tier, gym, raidTimes });
                expect(raid.state).toBe(state);
                expect(raid.refreshState(midPoint)).toSucceedWith(state);
                expect(raid.state).toBe('hatched');
                expect(raid.refreshState()).toSucceedWith('hatched');
                expect(raid.state).toBe(state);
            }
        });
    });

    describe('getDirectoryOptions static method', () => {
        it('should search by name and gym name name and index by unique alternate names', (): void => {
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
        it('should return true for exact string matches for a valid raid state', () => {
            for (const state of ['future', 'egg', 'hatched', 'expired']) {
                expect(Raid.isValidRaidState(state)).toBe(true);
            }
        });

        it('should return false for anything other than an exact string match for a valid raid state', () => {
            for (const state of ['Future', ' egg', 'whatever']) {
                expect(Raid.isValidRaidState(state)).toBe(false);
            }
        });
    });

    describe('validateRaidState static method', () => {
        it('should return a valid raid state for a matching string (normalized and trimmed)', () => {
            const tests: { tests: string[]; expected: RaidState }[] = [
                { tests: ['future', 'Future', '  futURE '], expected: 'future' },
                { tests: ['egg', 'EGG', 'egg'], expected: 'egg' },
                { tests: ['hatched', ' hatched ', 'HATCHED'], expected: 'hatched' },
                { tests: ['expired', 'Expired ', 'eXpired'], expected: 'expired' },
            ];

            for (const test of tests) {
                for (const state of test.tests) {
                    expect(Raid.validateRaidState(state)).toSucceedWith(test.expected);
                }
            }
        });

        it('should fail for anything else', () => {
            for (const state of ['Hutched', '_egg', 0, 7, true, () => 'hatched']) {
                expect(Raid.validateRaidState(state)).toFailWith(/invalid raid state/i);
            }
        });
    });
});
