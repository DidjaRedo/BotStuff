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
import { DEFAULT_SAVE_FILE, Raid, RaidManager, RaidType } from '../../../src/pogo';
import { ExtendedArray, succeed } from '@fgv/ts-utils';
import { TestListener, TestRaidGenerator, TestRaidManager } from '../../helpers/pogoHelpers';
import { ExplicitDateRange } from '../../../src/time/dateRange';
import { InMemoryLogger } from '@fgv/ts-utils/logger';
import moment from 'moment';

describe('RaidManager class', () => {
    const gyms = TestRaidManager.gyms;
    const bosses = TestRaidManager.bosses;
    const mockFs = TestRaidManager.mockFs;

    const testRaids = [
        'northstar|future|4',
        'jillyann|upcoming|5',
        'prescott|active|5|boss',
        'smith woods|active|2',
        'bellevue starbucks|active|4|boss',
        'evergreen village starbucks|upcoming|3',
        'overlake starbucks|active|3|boss',
        'painted parking lot|expired|5|boss',
    ];
    const testRaidData = TestRaidGenerator.generateForDirectory(testRaids, gyms, bosses);
    const saveData = testRaidData.getAsSaveFile();

    describe('constructors', () => {
        test('initializes with default options', () => {
            const spies = mockFs.startSpies();
            expect(RaidManager.create()).toSucceedAndSatisfy(() => {
                expect(spies.read).toHaveBeenCalledTimes(3);
                expect(spies.write).not.toHaveBeenCalled();
            });
            spies.restore();
        });

        test('initializes with specified files and log failures', () => {
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
            })).toSucceedAndSatisfy((rm: RaidManager) => {
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

        test('restores from a raid file if one exists', () => {
            mockFs.writeMockFileSync(DEFAULT_SAVE_FILE, saveData);

            const logger = new InMemoryLogger();
            const spies = mockFs.startSpies();
            expect(RaidManager.create({ logger: logger })).toSucceedAndSatisfy((rm: RaidManager) => {
                expect(rm.getRaid('northstar')).toSucceedWith(
                    expect.objectContaining({ tier: 4 }),
                );
            });

            spies.restore();
            mockFs.reset();
        });
    });

    describe('getGyms method', () => {
        const { rm } = TestRaidManager.setup(testRaids);
        test('returns matching gyms', () => {
            expect(rm.getGyms('starbucks').map((g) => g.item.primaryKey)).toEqual(expect.arrayContaining([
                'starbucksfirststore',
                'bellevuestarbucks',
                'juanitavillagestarbucks',
                'overlakestarbucks',
                'evergreenvillagestarbucks',
                'lakehillsstarbucks',
                'westlakeparkstarbucks',
                '7thandstewartstarbucks',
            ]));
        });
    });

    describe('getBosses method', () => {
        const { rm } = TestRaidManager.setup(testRaids);
        test('returns matching bosses', () => {
            expect(rm.getBosses('zapdos').map((b) => b.item.primaryKey)).toEqual(expect.arrayContaining([
                'zapdost5',
                'zapdost4',
            ]));
        });
    });

    describe('getAllRaids method', () => {
        const { rm } = TestRaidManager.setup(testRaids);
        test('returns all raids by default', () => {
            expect(rm.getAllRaids()).toSucceedAndSatisfy((raids: ExtendedArray<Raid>) => {
                expect(raids).toHaveLength(8);
            });
        });

        test('applies options if supplied', () => {
            expect(
                rm.getAllRaids({ requiredCities: ['redmond'] })
                    .onSuccess((raids: ExtendedArray<Raid>) => {
                        return succeed(raids.map((r) => r.gymName));
                    })
            ).toSucceedWith(expect.arrayContaining([
                'Painted Parking Lot',
                'Prescott Community Park',
                'Smith Woods',
                'Brooke Jillyann Bennette Park',
                'Northstar Park',
            ]));
        });

        test('fails if no matching raids are found', () => {
            expect(rm.getAllRaids(({ requiredCities: ['gotham'] }))).toFailWith(/no matching raids found/i);
        });
    });

    describe('getRaid method', () => {
        const { rm } = TestRaidManager.setup(testRaids);

        test('gets a raid that exists', () => {
            [
                'prescott',
                rm.gyms.lookup('prescott').singleItem().getValueOrThrow(),
            ].forEach((gym) => {
                expect(rm.getRaid(gym)).toSucceedWith(
                    expect.objectContaining({ tier: 5 }),
                );
            });
        });

        test('gets the best match if several matching raids exist', () => {
            expect(rm.getRaid('starbucks')).toSucceedWith(
                expect.objectContaining({
                    name: expect.stringContaining('Starbucks'),
                }),
            );
        });

        test('fails if no raid exists', () => {
            expect(rm.getRaid('prescott', { maxTier: 1 })).toFailWith(/no raid found matching/i);
            expect(rm.getRaid('xyzzy')).toFailWith(/no gyms match/i);
        });
    });

    describe('getRaids method', () => {
        const { rm } = TestRaidManager.setup(testRaids);

        test('gets a raid that exists', () => {
            expect(rm.getRaids('prescott')).toSucceedAndSatisfy((raids: ExtendedArray<Raid>) => {
                expect(raids).toHaveLength(1);
                expect(raids).toEqual(expect.arrayContaining([
                    expect.objectContaining({ name: expect.stringContaining('Prescott') }),
                ]));
            });
        });

        test('gets ordered list if several matching raids exist', () => {
            expect(rm.getRaids('starbucks')).toSucceedAndSatisfy((raids: ExtendedArray<Raid>) => {
                expect(raids.length).toBeGreaterThan(1);
                for (const raid of raids) {
                    expect(raid.name).toEqual(expect.stringContaining('Starbucks'));
                }
            });
        });

        test('gets an empty list if no raid exists at a matching gym', () => {
            expect(rm.getRaids('retrofitting')).toSucceedAndSatisfy((raids: ExtendedArray<Raid>) =>{
                expect(raids).toHaveLength(0);
            });
        });

        test('fails if no matching gyms are found', () => {
            expect(rm.getRaids('xyzzy')).toFailWith(/no gyms match/i);
        });
    });

    describe('addFutureRaid method', () => {
        test('adds a valid raid starting in the next 60 minutes', () => {
            const listener = new TestListener();
            const { rm } = TestRaidManager.setup(testRaids);
            rm.addListener(listener);

            const prescott = rm.gyms.lookup('prescott').firstItem().getValueOrDefault();
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
                        .toSucceedAndSatisfy((raid: Raid) => {
                            expect(raid.state).toEqual('upcoming');
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

        test('updates an existing raid', () => {
            const listener = new TestListener();
            const { rm } = TestRaidManager.setup([]);
            rm.addListener(listener);

            let firstRaid: Raid|undefined = undefined;
            expect(rm.addFutureRaid(20, 'prescott', 4)).toSucceedAndSatisfy((r: Raid) => {
                firstRaid = r;
            });
            expect(listener.raidUpdated).toHaveBeenLastCalledWith(
                rm, firstRaid, 'added', undefined
            );

            let secondRaid: Raid|undefined = undefined;
            expect(rm.addFutureRaid(20, 'prescott', 5, 'raid-hour')).toSucceedAndSatisfy((r: Raid) => {
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
            test('fails to update an existing raid', () => {
                const listener = new TestListener();
                const { rm } = TestRaidManager.setup([], { strict: true });
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
        const { rm } = TestRaidManager.setup(testRaids);

        test('adds a valid active raid', () => {
            const prescott = rm.gyms.lookup('prescott').firstItem().getValueOrDefault();
            const latias = rm.bosses.lookup('latias').firstItem().getValueOrDefault();
            [
                'latias',
                latias,
            ].forEach((boss) => {
                [
                    'prescott',
                    prescott,
                ].forEach((gym) => {
                    expect(rm.addActiveRaid(30, gym as string, boss as string))
                        .toSucceedAndSatisfy((raid: Raid) => {
                            expect(raid.state).toEqual('active');
                            expect(raid.tier).toEqual(5);
                            expect(raid.gym).toBe(prescott);
                            expect(raid.boss).toBe(latias);
                            expect(raid.raidTimes.duration()).toBe(45);
                        });
                });
            });
        });

        test('updates an existing raid', () => {
            const listener = new TestListener();
            const { rm } = TestRaidManager.setup([]);
            rm.addListener(listener);

            let firstRaid: Raid|undefined = undefined;
            expect(rm.addActiveRaid(20, 'prescott', 'lugia')).toSucceedAndSatisfy((r: Raid) => {
                firstRaid = r;
            });
            expect(firstRaid).toBeDefined();

            expect(listener.raidUpdated).toHaveBeenLastCalledWith(
                rm, firstRaid, 'added', undefined
            );

            let secondRaid: Raid|undefined = undefined;
            expect(rm.addActiveRaid(20, 'prescott', 'ho-oh', 'raid-hour')).toSucceedAndSatisfy((r: Raid) => {
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
            test('fails to update an existing raid', () => {
                const { rm } = TestRaidManager.setup([], { strict: true });

                expect(rm.addActiveRaid(20, 'prescott', 'lugia')).toSucceed();
                expect(rm.addActiveRaid(20, 'prescott', 'ho-oh', 'raid-hour')).toFailWith(/raid already reported/i);
                expect(rm.getRaid('prescott')).toSucceedWith(expect.objectContaining({
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    _boss: expect.objectContaining({ name: 'Lugia' }),
                }));
            });
        });
    });

    describe('updateRaid', () => {
        test('updates a hatched raid without or without a boss', () => {
            const prescott = gyms.lookup('prescott').firstItem().getValueOrThrow();
            const latias = bosses.lookup('latias').firstItem().getValueOrThrow();
            const groudon = bosses.lookup('groudon').firstItem().getValueOrThrow();
            [
                'latias',
                latias,
            ].forEach((boss) => {
                [
                    'prescott',
                    prescott,
                ].forEach((gym) => {
                    const { rm } = TestRaidManager.setup(['prescott|active|5|boss']);
                    expect(rm.updateRaid(gym, boss)).toSucceedWith(expect.objectContaining({
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        _boss: expect.objectContaining({ name: 'Latias' }),
                    }));

                    expect(rm.updateRaid(gym, groudon)).toSucceedWith(expect.objectContaining({
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        _boss: expect.objectContaining({ name: 'Groudon' }),
                    }));
                });
            });
        });

        test('fails to update a raid that has not hatched', () => {
            const prescott = gyms.lookup('prescott').firstItem().getValueOrThrow();
            const latias = bosses.lookup('latias').firstItem().getValueOrThrow();
            [
                'latias',
                latias,
            ].forEach((boss) => {
                [
                    'prescott',
                    prescott,
                ].forEach((gym) => {
                    const { rm } = TestRaidManager.setup(['prescott|upcoming|5|boss']);
                    expect(rm.updateRaid(gym, boss)).toFailWith(/cannot assign.*future raid/i);
                });
            });
        });
    });

    describe('listeners', () => {
        describe('addListener method', () => {
            test('adds a listener and not call it by default', () => {
                const { rm } = TestRaidManager.setup([]);

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

            test('adds a listener and not call it if specified', () => {
                const { rm } = TestRaidManager.setup(testRaids);

                const listener = new TestListener();
                expect(rm.addListener(listener, 'immediate')).toSucceedWith(true);
                expect(listener.raidListUpdated).toHaveBeenCalledTimes(1);
                expect(listener.raidUpdated).not.toHaveBeenCalled();
            });

            test('returns an error if the listener is already present', () => {
                const { rm } = TestRaidManager.setup(testRaids);

                const listener = new TestListener();
                expect(rm.addListener(listener, 'immediate')).toSucceedWith(true);
                expect(rm.addListener(listener)).toFailWith(/already exists/i);
            });
        });

        describe('removeListener method', () => {
            test('removes a listener that exists and return true', () => {
                const { rm } = TestRaidManager.setup(testRaids);

                const listener = new TestListener();
                expect(rm.addListener(listener)).toSucceedWith(true);
                expect(rm.removeListener(listener)).toSucceedWith(true);
                expect(rm.addActiveRaid(10, 'painted parking lot', 'lugia')).toSucceed();
                expect(listener.raidUpdated).not.toHaveBeenCalled();
            });

            test('returns an error if listener does not exist', () => {
                const { rm } = TestRaidManager.setup(testRaids);

                const listener = new TestListener();
                const listener2 = new TestListener();
                expect(rm.addListener(listener)).toSucceedWith(true);
                expect(rm.removeListener(listener2)).toFailWith(/does not exist/i);
            });
        });
    });

    describe('refreshRaidList method', () => {
        test('removes expired raids', () => {
            const { rm, logger } = TestRaidManager.setup(testRaids);
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

            expect(rm.getRaid('painted parking lot')).toFailWith(/no raid found/i);
        });

        test('hatches eggs that are past their time populating boss if unique', () => {
            const stateRelativeTo = moment().subtract(31, 'minutes').toDate();
            const spy = jest.spyOn(Raid, 'getCurrentStateFromRaidTimes')
                .mockImplementation((raidTimes: ExplicitDateRange, raidType?: RaidType) => {
                    return Raid.getStateFromRaidTimes(raidTimes, stateRelativeTo, raidType);
                });

            const { rm, logger } = TestRaidManager.setup(testRaids, undefined, stateRelativeTo);
            const listener = new TestListener();

            ['jillyann', 'evergreen village starbucks'].forEach((gymName) => {
                expect(rm.getRaid(gymName)).toSucceedWith(expect.objectContaining({
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    _state: 'upcoming',
                }));
            });

            expect(rm.addListener(listener)).toSucceedWith(true);
            expect(() => rm.refreshRaidList()).not.toThrow();
            expect(listener.raidListUpdated).toHaveBeenCalled();
            expect(logger.messages).toEqual(expect.arrayContaining([
                expect.stringMatching(/raid egg hatched.*jillyann/i),
            ]));

            // Only one tier 5 boss
            expect(rm.getRaid('jillyann')).toSucceedAndSatisfy((raid: Raid) => {
                expect(raid.state).toBe('active');
                expect(raid.boss).toBeDefined();
                expect(raid.boss?.tier).toBe(raid.tier);
            });

            // Many tier 3 bosses
            expect(rm.getRaid('evergreen village starbucks')).toSucceedAndSatisfy((raid: Raid) => {
                expect(raid.state).toBe('active');
                expect(raid.boss).not.toBeDefined();
            });

            spy.mockRestore();
        });
    });

    describe('timer', () => {
        describe('start method', () => {
            test('starts a stopped timer and set interval if supplied', () => {
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

            test('returns false without starting if refresh interval is 0', () => {
                const spies = mockFs.startSpies();
                const rm = new RaidManager({ refreshInterval: 0 });
                spies.restore();

                expect(rm.refreshInterval).toBe(0);
                expect(rm.isRunning).toBe(false);
                expect(rm.start()).toSucceedWith(false);
                expect(rm.refreshInterval).toBe(0);
                expect(rm.isRunning).toBe(false);
            });

            test('invokes refresh immediately if "immediate" is specified and no timer is running', () => {
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

            test('fails if timer is already running', () => {
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
            test('stops a running timer', () => {
                const spies = mockFs.startSpies();
                const rm = new RaidManager({ refreshInterval: 60, autoStart: true });
                spies.restore();

                expect(rm.refreshInterval).toBe(60);
                expect(rm.isRunning).toBe(true);
                expect(rm.stop()).toSucceedWith(true);
                expect(rm.isRunning).toBe(false);
                expect(rm.refreshInterval).toBe(60);
            });

            test('fails if no timer is running', () => {
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
