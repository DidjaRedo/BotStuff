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

import { BossDirectory, loadBossDirectorySync } from './bossDirectory';
import { GlobalGymDirectory, loadGlobalGymDirectorySync } from './gymDirectory';
import { Logger, NoOpLogger } from '../utils/logger';
import { Raid, RaidType } from './raid';
import { RaidMap, loadRaidMapSync } from './raidMap';
import { Result, allSucceed, captureResult, fail, populateObject, succeed } from '../utils/result';
import { Boss } from './boss';
import { Gym } from './gym';
import { ItemArray } from '../names/directory';
import { RaidLookupOptions } from './raidDirectory';
import { RaidTier } from './pogo';
import { saveJsonFile } from '../utils/jsonHelpers';

export const DEFAULT_BOSSES_FILE = './data/bosses.json';
export const DEFAULT_GYMS_FILE = './data/gyms.json';
export const DEFAULT_SAVE_FILE = './state/latest.json';
export const DEFAULT_REFRESH_INTERVAL = 30;

export type RaidChangeType = 'added'|'updated'|'hatched'|'ended'|'deleted';
export interface RaidManagerListener {
    raidUpdated(rm: RaidManager, raid: Raid, change: RaidChangeType, prior?: Raid): void;
    raidListUpdated(rm: RaidManager): void;
}

export interface RaidManagerOptions {
    strict?: boolean;
    logger?: Logger;
    refreshInterval?: number;
    autoStart?: boolean;
    autoSave?: boolean;

    bossesFile?: string;
    gymsFile?: string;
    saveFile?: string;
}

export class RaidManager {
    public bosses: BossDirectory;
    public gyms: GlobalGymDirectory;
    public get strict(): boolean { return this._strict; }
    public get refreshInterval(): number { return this._refreshInterval; }

    protected _raids: RaidMap;

    protected _strict = false;
    protected _logger: Logger;

    protected _bossesFile: string;
    protected _gymsFile: string;
    protected _saveFile: string;
    protected _autoSave: boolean;

    protected _reportingSuspended = false;
    protected _refreshInterval: number;
    protected _timer?: NodeJS.Timeout;

    protected _listeners: RaidManagerListener[];

    public constructor(options?: RaidManagerOptions) {
        options = options ?? {};

        this._logger = options.logger ?? new NoOpLogger();
        this._strict = options.strict ?? false;

        this._bossesFile = options.bossesFile ?? DEFAULT_BOSSES_FILE;
        this._gymsFile = options.gymsFile ?? DEFAULT_GYMS_FILE;
        this._saveFile = options.saveFile ?? DEFAULT_SAVE_FILE;
        this._autoSave = (options.autoSave !== false);

        this._reportingSuspended = false;
        this._refreshInterval = options.refreshInterval ?? DEFAULT_REFRESH_INTERVAL;
        this._listeners = [];

        this.bosses = loadBossDirectorySync(this._bossesFile).onFailure((m) => {
            return this._logger.error(`Unable to load bosses from ${this._bossesFile}: ${m}`);
        }).getValueOrThrow();

        this.gyms = loadGlobalGymDirectorySync(this._gymsFile).onFailure((m) => {
            return this._logger.error(`Unable to load gyms from ${this._gymsFile}: ${m}`);
        }).getValueOrThrow();

        this._raids = this._restore().getValueOrThrow();

        if (options.autoStart === true) {
            this.start(this._refreshInterval, 'immediate').getValueOrThrow();
        }
        else {
            this.refreshRaidList();
        }
    }

    public static create(options?: RaidManagerOptions): Result<RaidManager> {
        return captureResult(() => new RaidManager(options));
    }

    public getRaids(
        want: string,
        options?: RaidLookupOptions,
    ): ItemArray<Raid> {
        return this._raids.getRaidsAtGyms(this.gyms.lookup(want, options).allItems(), options);
    }

    public getRaid(
        want: string,
        options?: RaidLookupOptions,
    ): Result<Raid> {
        return this.getRaids(want, options).best();
    }

    public addFutureRaid(start: Date, gymName: string, tier: RaidTier, raidType?: RaidType): Result<Raid>;
    public addFutureRaid(start: Date, gym: Gym, tier: RaidTier, raidType?: RaidType): Result<Raid>;
    public addFutureRaid(start: number, gymName: string, tier: RaidTier, raidType?: RaidType): Result<Raid>;
    public addFutureRaid(start: number, gym: Gym, tier: RaidTier, raidType?: RaidType): Result<Raid>;
    public addFutureRaid(start: Date|number, gymSpec: string|Gym, tier: RaidTier, raidType?: RaidType): Result<Raid> {
        const gymResult = (typeof gymSpec === 'string') ? this.gyms.lookup(gymSpec).bestItem() : succeed(gymSpec);

        return gymResult.onSuccess((gym) => {
            return Raid.createFutureRaid(start as number, gym, tier, raidType);
        }).onSuccess((raid) => {
            if (this._strict && this._raids.has(raid.gymName)) {
                return fail(`Raid already reported at ${raid.gymName}`);
            }
            return this._raids.swap(raid).onSuccess((prior: Raid) => {
                const change = (prior === undefined) ? 'added' : 'updated';
                this._reportRaidUpdate(raid, change, prior);
                this._reportRaidListUpdate();
                return succeed(raid);
            });
        });
    }

    public addActiveRaid(timeLeftInMinutes: number, gymSpec: string|Gym, bossSpec: string|Boss, raidType?: RaidType): Result<Raid> {
        return populateObject<{gym: Gym, boss: Boss, raid: Raid}>({
            gym: () => (typeof gymSpec === 'string') ? this.gyms.lookup(gymSpec).bestItem() : succeed(gymSpec),
            boss: () => (typeof bossSpec === 'string') ? this.bosses.lookup(bossSpec).bestItem() : succeed(bossSpec),
            raid: (params) => Raid.createActiveRaid(timeLeftInMinutes, params.gym, params.boss, raidType),
        }).onSuccess((args) => {
            if (this._strict && this._raids.has(args.raid.gymName)) {
                return fail(`Raid already reported at ${args.raid.gymName}`);
            }
            return this._raids.swap(args.raid).onSuccess((prior: Raid) => {
                const change = (prior === undefined) ? 'added' : 'updated';
                this._reportRaidUpdate(args.raid, change, prior);
                this._reportRaidListUpdate();
                return succeed(args.raid);
            });
        });
    }

    public addListener(listener: RaidManagerListener, immediate?: 'immediate'): Result<boolean> {
        if (this._listeners.includes(listener)) {
            return fail('Requested listener already exists');
        }
        this._listeners.push(listener);
        if (immediate === 'immediate') {
            listener.raidListUpdated(this);
        }
        return succeed(true);
    }

    public removeListener(listener: RaidManagerListener): Result<boolean> {
        const index = this._listeners.indexOf(listener);
        if (index < 0) {
            return fail('Requested listener does not exist');
        }
        this._listeners.splice(index, 1);
        return succeed(true);
    }

    public get isRunning(): boolean { return (this._timer !== undefined); }

    public start(timer?: number, immediate?: 'immediate'): Result<boolean> {
        if (this._timer === undefined) {
            if (immediate) {
                this.refreshRaidList();
            }

            this._refreshInterval = timer ?? this._refreshInterval;
            if (this._refreshInterval > 0) {
                this._timer = setInterval(() => this.refreshRaidList(), this._refreshInterval * 1000);
                this._logger.info(`Timer started with ${this._refreshInterval} second interval`);
                return succeed(true);
            }
            this._logger.info('Timer not started due to 0 interval');
            return succeed(false);
        }
        return fail('Timer is already running');
    }

    public stop(): Result<boolean> {
        if (this._timer !== undefined) {
            clearInterval(this._timer);
            this._timer = undefined;
            this._logger.info('Timer stopped');
            return succeed(true);
        }
        return fail('No timer is running');
    }

    public refreshRaidList(): void {
        let changed = false;
        for (const raid of this._raids.values()) {
            const priorState = raid.refreshState().getValueOrThrow();
            changed = changed || (priorState !== raid.state);

            if (raid.state === 'hatched') {
                const boss = this.bosses.getAll({ tier: raid.tier, isActive: true }).single().getValueOrDefault();
                const bossName = boss?.displayName ?? `unknown T${raid.tier}`;
                if (boss !== undefined) {
                    raid.update(boss);
                }
                this._logger.log(`[Raid Manager]: Raid Egg Hatched ${bossName} at ${raid.gymName}`);
            }
            else if (raid.state === 'expired') {
                this._logger.log(`[Raid Manager]: Raid expired at ${raid.gymName}`);
                // istanbul ignore else
                if (this._raids.delete(raid.keys.gymName)) {
                    changed = true;
                }
                else {
                    this._logger.warn(`[Raid Manager]: Unable to delete raid at ${raid.gymName}`);
                }
            }
        }
        if (changed) {
            this._reportRaidListUpdate();
        }
    }

    protected _restore(): Result<RaidMap> {
        // istanbul ignore else
        if (this._saveFile) {
            const loadResult = loadRaidMapSync(this._saveFile, this.gyms, this.bosses).onFailure((m) => {
                return this._logger.warnAndFail(`Failed to load raid map from ${this._saveFile}: ${m}`);
            });

            if (loadResult.isSuccess()) {
                return loadResult;
            }
        }

        return captureResult(() => new RaidMap()).onFailure(
            // istanbul ignore next
            (m) => { return this._logger.error(`Failed to create empty raid map: ${m}`); }
        );
    }

    protected _trySaveState(isAutoSave: boolean): Result<boolean> {
        if (isAutoSave && !this._autoSave) {
            return succeed(false);
        }

        const raids = Array.from(this._raids.values()).map((r) => r.toJson());
        return saveJsonFile(this._saveFile, raids);
    }

    protected _reportRaidListUpdate(): Result<boolean> {
        return allSucceed([
            ...this._listeners.map((l) => captureResult(() => l.raidListUpdated(this))),
            this._trySaveState(true),
        ]);
    }

    protected _reportRaidUpdate(raid: Raid, change: RaidChangeType, prior?: Raid): Result<boolean> {
        return allSucceed([
            ...this._listeners.map((l) => captureResult(() => l.raidUpdated(this, raid, change, prior))),
        ]);
    }
}
