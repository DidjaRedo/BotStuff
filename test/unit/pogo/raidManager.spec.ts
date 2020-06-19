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
import {
    DEFAULT_BOSSES_FILE,
    DEFAULT_GYMS_FILE,
    DEFAULT_SAVE_FILE,
    RaidManager,
    RaidManagerListener,
    RaidManagerOptions,
} from '../../../src/pogo/raidManager';
import { Raid, RaidType } from '../../../src/pogo/raid';
import { Result, succeed } from '../../../src/utils/result';
import { TestRaidData, TestRaidGenerator } from '../../helpers/pogoHelpers';
import { DateRange } from '../../../src/time/dateRange';
import { InMemoryLogger } from '../../../src/utils/logger';
import { MockFileSystem } from '../../helpers/dataHelpers';
import { RaidMap } from '../../../src/pogo/raidMap';
import { loadBossDirectorySync } from '../../../src/pogo/bossDirectory';
import { loadGlobalGymDirectorySync } from '../../../src/pogo/gymDirectory';
import moment from 'moment';

class TestRaidManager extends RaidManager {
    public constructor(options?: RaidManagerOptions) {
        super({ autoSave: false, autoStart: false, ...(options ?? {}) });
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

class TestListener implements RaidManagerListener {
    public raidUpdated = jest.fn();
    public raidListUpdated = jest.fn();
    public reset() {
        this.raidListUpdated.mockClear();
        this.raidUpdated.mockClear();
    }
}

describe('RaidManager class', () => {
    const gyms = loadGlobalGymDirectorySync('./test/unit/pogo/data/gymArrays.json').getValueOrThrow();
    const bosses = loadBossDirectorySync('./test/unit/pogo/data/validBossDirectory.json').getValueOrThrow();
    const testRaids = [
        'northstar|future|4',
        'jillyann|egg|5',
        'prescott|hatched|5|boss',
        'smith woods|hatched|2',
        'bellevue starbucks|hatched|4|boss',
        'evergreen starbucks|egg|3',
        'overlake starbucks|hatched|3|boss',
        'painted parking lot|expired|5|boss',
    ];
    const testRaidData = TestRaidGenerator.generateForDirectory(testRaids, gyms, bosses);
    const saveData = testRaidData.getAsSaveFile();

    const mockFs = new MockFileSystem([
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

    type RaidManagerTestData = { testData: TestRaidData, logger: InMemoryLogger, rm: TestRaidManager };

    function getTestRm(raids: string[], options?: Partial<RaidManagerOptions>, relativeTo?: Date): RaidManagerTestData {
        const testData = TestRaidGenerator.generateForDirectory(raids, gyms, bosses);
        const logger = new InMemoryLogger();
        const saveData = testData.getAsSaveFile(relativeTo);

        mockFs.reset();
        const spies = mockFs.startSpies();

        // we do it this way to bypass the refresh on the normal restore,
        // which would automatically process expired or hatched raids. Since
        // this is a test instrument we want to end up with exactly the requested
        // contents.
        const rm = new TestRaidManager({ autoSave: false, autoStart: false, logger, ...(options ?? {}) });
        mockFs.writeMockFileSync(DEFAULT_SAVE_FILE, saveData);
        rm.restore().getValueOrThrow();

        spies.restore();
        mockFs.reset();
        logger.clear();
        return { testData, logger, rm };
    }

    describe('constructors', () => {
        it('should initialize with default options', () => {
            const spies = mockFs.startSpies();
            expect(RaidManager.create()).toSucceedWithCallback(() => {
                expect(spies.read).toHaveBeenCalledTimes(3);
                expect(spies.write).not.toHaveBeenCalled();
            });
            spies.restore();
        });

        it('should initialize with specified files and log failures', () => {
            const spies = mockFs.startSpies();
            const logger = new InMemoryLogger('detail');
            expect(RaidManager.create({
                bossesFile: 'NoExisto.json',
                logger: logger,
            })).toFailWith(/file not found/i);
            expect(spies.read).toHaveBeenLastCalledWith(expect.stringContaining('NoExisto.json'), expect.anything());
            expect(logger.messages).toEqual(expect.arrayContaining([
                expect.stringMatching(/unable to load bosses.*noexisto/i),
            ]));

            spies.clear();
            logger.clear();

            expect(RaidManager.create({
                gymsFile: 'NoGyms.json',
                logger: logger,
            })).toFailWith(/file not found/i);
            expect(spies.read).toHaveBeenLastCalledWith(expect.stringContaining('NoGyms.json'), expect.anything());
            expect(logger.messages).toEqual(expect.arrayContaining([
                expect.stringMatching(/unable to load gyms.*nogyms/i),
            ]));

            spies.clear();
            logger.clear();

            expect(RaidManager.create({
                saveFile: 'Saveomatic.json',
                strict: true,
                refreshInterval: 23,
                logger: logger,
            })).toSucceedWithCallback((rm: RaidManager) => {
                expect(rm.strict).toBe(true);
                expect(rm.refreshInterval).toBe(23);
                rm.stop();
            });
            expect(spies.read).toHaveBeenLastCalledWith(expect.stringContaining('Saveomatic.json'), expect.anything());
            expect(logger.messages).toEqual(expect.arrayContaining([
                expect.stringMatching(/failed to load raid map.*saveomatic/i),
            ]));
            spies.restore();
        });

        it('should restore from a raid file if one exists', () => {
            mockFs.writeMockFileSync(DEFAULT_SAVE_FILE, saveData);

            const logger = new InMemoryLogger();
            const spies = mockFs.startSpies();
            expect(RaidManager.create({ logger: logger })).toSucceedWithCallback((rm: RaidManager) => {
                expect(rm.getRaid('northstar')).toSucceedWith(
                    expect.objectContaining({ tier: 4 }),
                );
            });

            spies.restore();
            mockFs.reset();
        });
    });

    describe('getRaid method', () => {
        const { rm } = getTestRm(testRaids);

        it('should get a raid that exists', () => {
            expect(rm.getRaid('prescott')).toSucceedWith(
                expect.objectContaining({ tier: 5 }),
            );
        });

        it('should get the best match if several matching raids exist', () => {
            expect(rm.getRaid('starbucks')).toSucceedWith(
                expect.objectContaining({
                    name: expect.stringContaining('Starbucks'),
                }),
            );
        });

        it('should fail if no raid exists', () => {
            expect(rm.getRaid('xyzzy')).toFailWith(/raid not found/i);
        });
    });

    describe('getRaids method', () => {
        const { rm } = getTestRm(testRaids);

        it('should get a raid that exists', () => {
            const raids = rm.getRaids('prescott');
            expect(raids).toHaveLength(1);
            expect(raids).toEqual(expect.arrayContaining([
                expect.objectContaining({ name: expect.stringContaining('Prescott') }),
            ]));
        });

        it('should get ordered list if several matching raids exist', () => {
            const raids = rm.getRaids('starbucks');
            expect(raids.length).toBeGreaterThan(1);
            for (const raid of raids) {
                expect(raid.name).toEqual(expect.stringContaining('Starbucks'));
            }
        });

        it('should get an empty list if no raid exists', () => {
            expect(rm.getRaids('xyzzy')).toHaveLength(0);
        });
    });

    describe('addFutureRaid method', () => {
        it('should add a valid raid starting in the next 60 minutes', () => {
            const listener = new TestListener();
            const { rm } = getTestRm(testRaids);
            rm.addListener(listener);

            const prescott = rm.gyms.lookup('prescott').bestItem().getValueOrDefault();
            [
                moment().add(30, 'minutes').toDate(),
                30,
            ].forEach((start) => {
                [
                    'prescott',
                    prescott,
                ].forEach((gym) => {
                    listener.reset();
                    expect(rm.addFutureRaid(start as number, gym as string, 5))
                        .toSucceedWithCallback((raid: Raid) => {
                            expect(raid.state).toEqual('egg');
                            expect(raid.tier).toEqual(5);
                            expect(raid.gym).toBe(prescott);
                            expect(raid.boss).toBeUndefined();
                            expect(raid.raidTimes.duration()).toBe(45);
                            expect(listener.raidUpdated).toHaveBeenLastCalledWith(
                                rm, expect.any(Raid), 'updated', expect.any(Raid),
                            );
                            expect(listener.raidListUpdated).toHaveBeenCalled();
                        });
                });
            });
        });

        it('should update an existing raid', () => {
            const listener = new TestListener();
            const { rm } = getTestRm([]);
            rm.addListener(listener);

            let firstRaid: Raid;
            expect(rm.addFutureRaid(20, 'prescott', 4)).toSucceedWithCallback((r: Raid) => {
                firstRaid = r;
            });
            expect(listener.raidUpdated).toHaveBeenLastCalledWith(
                rm, firstRaid, 'added', undefined
            );

            let secondRaid: Raid;
            expect(rm.addFutureRaid(20, 'prescott', 5, 'raid-hour')).toSucceedWithCallback((r: Raid) => {
                secondRaid = r;
            });

            expect(listener.raidUpdated).toHaveBeenLastCalledWith(
                rm, secondRaid, 'updated', firstRaid
            );

            expect(rm.getRaid('prescott')).toSucceedWith(expect.objectContaining({
                raidType: 'raid-hour',
            }));
        });

        describe('in strict mode', () => {
            it('should fail to update an existing raid', () => {
                const listener = new TestListener();
                const { rm } = getTestRm([], { strict: true });
                rm.addListener(listener);

                expect(rm.addFutureRaid(20, 'prescott', 4)).toSucceed();

                listener.reset();
                expect(rm.addFutureRaid(20, 'prescott', 5, 'raid-hour')).toFailWith(/raid already reported/i);
                expect(listener.raidUpdated).not.toHaveBeenCalled();
                expect(listener.raidListUpdated).not.toHaveBeenCalled();
                expect(rm.getRaid('prescott')).toSucceedWith(expect.objectContaining({
                    raidType: 'normal',
                }));
            });
        });
    });

    describe('addActiveRaid method', () => {
        const { rm } = getTestRm(testRaids);

        it('should add a valid active raid', () => {
            const prescott = rm.gyms.lookup('prescott').bestItem().getValueOrDefault();
            const latias = rm.bosses.lookup('latias').bestItem().getValueOrDefault();
            [
                'latias',
                latias,
            ].forEach((boss) => {
                [
                    'prescott',
                    prescott,
                ].forEach((gym) => {
                    expect(rm.addActiveRaid(30, gym as string, boss as string))
                        .toSucceedWithCallback((raid: Raid) => {
                            expect(raid.state).toEqual('hatched');
                            expect(raid.tier).toEqual(5);
                            expect(raid.gym).toBe(prescott);
                            expect(raid.boss).toBe(latias);
                            expect(raid.raidTimes.duration()).toBe(45);
                        });
                });
            });
        });

        it('should update an existing raid', () => {
            const listener = new TestListener();
            const { rm } = getTestRm([]);
            rm.addListener(listener);

            let firstRaid: Raid;
            expect(rm.addActiveRaid(20, 'prescott', 'lugia')).toSucceedWithCallback((r: Raid) => {
                firstRaid = r;
            });

            expect(listener.raidUpdated).toHaveBeenLastCalledWith(
                rm, firstRaid, 'added', undefined
            );

            let secondRaid: Raid;
            expect(rm.addActiveRaid(20, 'prescott', 'ho-oh', 'raid-hour')).toSucceedWithCallback((r: Raid) => {
                secondRaid = r;
            });
            expect(listener.raidUpdated).toHaveBeenLastCalledWith(
                rm, secondRaid, 'updated', firstRaid
            );

            expect(rm.getRaid('prescott')).toSucceedWith(expect.objectContaining({
                // eslint-disable-next-line @typescript-eslint/naming-convention
                _boss: expect.objectContaining({ name: 'Ho-oh' }),
            }));
        });

        describe('in strict mode', () => {
            it('should fail to update an existing raid', () => {
                const { rm } = getTestRm([], { strict: true });

                expect(rm.addActiveRaid(20, 'prescott', 'lugia')).toSucceed();
                expect(rm.addActiveRaid(20, 'prescott', 'ho-oh', 'raid-hour')).toFailWith(/raid already reported/i);
                expect(rm.getRaid('prescott')).toSucceedWith(expect.objectContaining({
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    _boss: expect.objectContaining({ name: 'Lugia' }),
                }));
            });
        });
    });

    describe('listeners', () => {
        describe('addListener method', () => {
            it('should add a listener and not call it by default', () => {
                const { rm } = getTestRm([]);

                const listener = new TestListener();
                expect(rm.addListener(listener)).toSucceedWith(true);
                expect(listener.raidListUpdated).not.toHaveBeenCalled();
                expect(rm.addFutureRaid(10, 'painted parking lot', 4)).toSucceed();
                expect(listener.raidUpdated).toHaveBeenLastCalledWith(
                    rm,
                    expect.objectContaining({ gymName: 'Painted Parking Lot' }),
                    'added',
                    undefined,
                );
                expect(listener.raidListUpdated).toHaveBeenCalledTimes(1);
            });

            it('should add a listener and not call it if specified', () => {
                const { rm } = getTestRm(testRaids);

                const listener = new TestListener();
                expect(rm.addListener(listener, 'immediate')).toSucceedWith(true);
                expect(listener.raidListUpdated).toHaveBeenCalledTimes(1);
                expect(listener.raidUpdated).not.toHaveBeenCalled();
            });

            it('should return an error if the listener is already present', () => {
                const { rm } = getTestRm(testRaids);

                const listener = new TestListener();
                expect(rm.addListener(listener, 'immediate')).toSucceedWith(true);
                expect(rm.addListener(listener)).toFailWith(/already exists/i);
            });
        });

        describe('removeListener method', () => {
            it('should remove a listener that exists and return true', () => {
                const { rm } = getTestRm(testRaids);

                const listener = new TestListener();
                expect(rm.addListener(listener)).toSucceedWith(true);
                expect(rm.removeListener(listener)).toSucceedWith(true);
                expect(rm.addActiveRaid(10, 'painted parking lot', 'lugia')).toSucceed();
                expect(listener.raidUpdated).not.toHaveBeenCalled();
            });

            it('should return an error if listener does not exist', () => {
                const { rm } = getTestRm(testRaids);

                const listener = new TestListener();
                const listener2 = new TestListener();
                expect(rm.addListener(listener)).toSucceedWith(true);
                expect(rm.removeListener(listener2)).toFailWith(/does not exist/i);
            });
        });
    });

    describe('refreshRaidList method', () => {
        it('should remove expired raids', () => {
            const { rm, logger } = getTestRm(testRaids);
            const listener = new TestListener();

            expect(rm.getRaid('painted parking lot')).toSucceedWith(expect.objectContaining({
                // eslint-disable-next-line @typescript-eslint/naming-convention
                _state: 'expired',
            }));

            expect(rm.addListener(listener)).toSucceedWith(true);
            expect(() => rm.refreshRaidList()).not.toThrow();
            expect(listener.raidListUpdated).toHaveBeenCalled();
            expect(logger.messages).toEqual(expect.arrayContaining([
                expect.stringMatching(/raid expired at painted/i),
            ]));

            expect(rm.getRaid('painted parking lot')).toFailWith(/raid not found/i);
        });

        it('should hatch eggs that are past their time populating boss if unique', () => {
            const stateRelativeTo = moment().subtract(31, 'minutes').toDate();
            const spy = jest.spyOn(Raid, 'getCurrentStateFromRaidTimes')
                .mockImplementation((raidTimes: DateRange, raidType?: RaidType) => {
                    return Raid.getStateFromRaidTimes(raidTimes, stateRelativeTo, raidType);
                });

            const { rm, logger } = getTestRm(testRaids, undefined, stateRelativeTo);
            const listener = new TestListener();

            ['jillyann', 'evergreen starbucks'].forEach((gymName) => {
                expect(rm.getRaid(gymName)).toSucceedWith(expect.objectContaining({
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    _state: 'egg',
                }));
            });

            expect(rm.addListener(listener)).toSucceedWith(true);
            expect(() => rm.refreshRaidList()).not.toThrow();
            expect(listener.raidListUpdated).toHaveBeenCalled();
            expect(logger.messages).toEqual(expect.arrayContaining([
                expect.stringMatching(/raid egg hatched.*jillyann/i),
            ]));

            // Only one tier 5 boss
            expect(rm.getRaid('jillyann')).toSucceedWithCallback((raid: Raid) => {
                expect(raid.state).toBe('hatched');
                expect(raid.boss).toBeDefined();
                expect(raid.boss.tier).toBe(raid.tier);
            });

            // Many tier 3 bosses
            expect(rm.getRaid('evergreen starbucks')).toSucceedWithCallback((raid: Raid) => {
                expect(raid.state).toBe('hatched');
                expect(raid.boss).not.toBeDefined();
            });

            spy.mockRestore();
        });
    });

    describe('timer', () => {
        describe('start method', () => {
            it('should start a stopped timer and set interval if supplied', () => {
                const spies = mockFs.startSpies();
                const rm = new RaidManager({ refreshInterval: 0 });
                spies.restore();

                jest.useFakeTimers();
                expect(rm.refreshInterval).toBe(0);
                expect(rm.isRunning).toBe(false);

                const spy = jest.spyOn(rm, 'refreshRaidList');
                expect(rm.start(10)).toSucceedWith(true);
                expect(spy).not.toHaveBeenCalled();
                expect(rm.refreshInterval).toBe(10);
                expect(rm.isRunning).toBe(true);

                jest.advanceTimersByTime(12 * 1000);
                expect(spy).toHaveBeenCalled();

                expect(rm.stop()).toSucceedWith(true);
                jest.useRealTimers();
            });

            it('should return false without starting if refresh interval is 0', () => {
                const spies = mockFs.startSpies();
                const rm = new RaidManager({ refreshInterval: 0 });
                spies.restore();

                expect(rm.refreshInterval).toBe(0);
                expect(rm.isRunning).toBe(false);
                expect(rm.start()).toSucceedWith(false);
                expect(rm.refreshInterval).toBe(0);
                expect(rm.isRunning).toBe(false);
            });

            it('should invoke refresh immediately if "immediate" is specified and no timer is running', () => {
                const spies = mockFs.startSpies();
                const rm = new RaidManager({ refreshInterval: 0 });
                spies.restore();

                jest.useFakeTimers();
                expect(rm.refreshInterval).toBe(0);
                expect(rm.isRunning).toBe(false);

                const spy = jest.spyOn(rm, 'refreshRaidList');
                expect(rm.start(0, 'immediate')).toSucceedWith(false);
                expect(spy).toHaveBeenCalledTimes(1);

                expect(rm.start(10, 'immediate')).toSucceedWith(true);
                expect(spy).toHaveBeenCalledTimes(2);
                expect(rm.refreshInterval).toBe(10);
                expect(rm.isRunning).toBe(true);

                jest.advanceTimersByTime(12 * 1000);
                expect(spy).toHaveBeenCalledTimes(3);

                expect(rm.stop()).toSucceedWith(true);
                jest.useRealTimers();
            });

            it('should fail if timer is already running', () => {
                const spies = mockFs.startSpies();
                const rm = new RaidManager({ refreshInterval: 0 });
                spies.restore();

                expect(rm.refreshInterval).toBe(0);
                expect(rm.isRunning).toBe(false);
                expect(rm.start(60)).toSucceedWith(true);
                expect(rm.refreshInterval).toBe(60);
                expect(rm.isRunning).toBe(true);
                expect(rm.start()).toFailWith(/already running/i);
                expect(rm.isRunning).toBe(true);
                expect(rm.refreshInterval).toBe(60);
                expect(rm.stop()).toSucceedWith(true);
            });
        });
        describe('stop method', () => {
            it('should stop a running timer', () => {
                const spies = mockFs.startSpies();
                const rm = new RaidManager({ refreshInterval: 60, autoStart: true });
                spies.restore();

                expect(rm.refreshInterval).toBe(60);
                expect(rm.isRunning).toBe(true);
                expect(rm.stop()).toSucceedWith(true);
                expect(rm.isRunning).toBe(false);
                expect(rm.refreshInterval).toBe(60);
            });

            it('should fail if no timer is running', () => {
                const spies = mockFs.startSpies();
                const rm = new RaidManager({ refreshInterval: 0 });
                spies.restore();

                expect(rm.isRunning).toBe(false);
                expect(rm.stop()).toFailWith(/no timer/i);
                expect(rm.isRunning).toBe(false);
            });
        });
    });
});
