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

import * as Converters from '../utils/converters';
import { Raid, raid } from './raid';
import { RaidDirectory, RaidLookupOptions } from './raidDirectory';
import { Result, captureResult, fail, mapResults, succeed } from '../utils/result';
import { BossDirectory } from './bossDirectory';
import { Converter } from '../utils/converter';
import { GlobalGymDirectory } from './gymDirectory';
import { Gym } from './gym';
import { ItemArray } from '../utils/utils';
import { Names } from '../names/names';
import { NormalizedMap } from '../names/normalizedMap';
import { loadJsonFile } from '../utils/jsonHelpers';

export class RaidMap implements Map<string, Raid> {
    private _map: NormalizedMap<Raid>;

    public constructor(raids?: Iterable<Raid>) {
        this._map = new NormalizedMap();
        this.addRange(raids);
    }

    public static create(raids?: Iterable<Raid>): Result<RaidMap> {
        return captureResult(() => new RaidMap(raids));
    }

    public add(raid: Raid): Result<Raid> {
        return this.setStrict(raid.gym.primaryKey, raid);
    }

    public addOrUpdate(raid: Raid): Result<Raid> {
        return this.trySet(raid.gym.primaryKey, raid);
    }

    public swap(raid: Raid): Result<Raid|undefined> {
        const prior = this.tryGet(raid.gym.primaryKey);
        return this.trySet(raid.gym.primaryKey, raid).onSuccess(() => {
            return succeed(prior);
        });
    }

    public addRange(raids?: Iterable<Raid>): Result<Raid[]> {
        if (raids === undefined) {
            return succeed([]);
        }

        return mapResults(
            Array.from(raids).map((r) => this.add(r)),
        );
    }

    public addOrUpdateRange(raids?: Iterable<Raid>): Result<Raid[]> {
        if (raids === undefined) {
            return succeed([]);
        }

        return mapResults(
            Array.from(raids).map((r) => this.addOrUpdate(r)),
        );
    }

    public getStrict(name: string): Result<Raid> {
        const existing = this.tryGet(name);
        if (existing === undefined) {
            return fail(`No raid found at ${name}.`);
        }
        return succeed(existing);
    }

    public tryGet(name: string): Raid|undefined {
        return this._map.get(name);
    }

    public get(name: string): Raid|undefined {
        return this.tryGet(name);
    }

    public getRaidsAtGyms(
        gyms: Gym[],
        options?: Partial<RaidLookupOptions>,
    ): ItemArray<Raid> {
        return new ItemArray('raid',
            ...gyms.map((g) => this.tryGet(g.keys.name))
                .filter((r): r is Raid => (r !== undefined) && RaidDirectory.filter(r, options)),
        );
    }

    public set(name: string, value: Raid): this {
        this.trySet(name, value).getValueOrThrow();
        return this;
    }

    public setStrict(name: string, value: Raid): Result<Raid> {
        if (this.tryGet(name)) {
            return fail(`Raid already exists for ${name}.`);
        }
        return this.trySet(name, value);
    }

    public trySet(name: string, value: Raid): Result<Raid> {
        const normalized = Names.normalize(name).getValueOrDefault();
        if (normalized !== value.keys.gymName) {
            return fail(`Mismatched name: got ${name} for ${value.gymName}`);
        }
        return this._map.trySet(normalized, value);
    }

    public has(name: string): boolean {
        return this._map.has(name);
    }

    public clear(): void {
        this._map.clear();
    }

    public delete(name: string): boolean;
    public delete(raid: Raid): boolean;
    public delete(gym: Gym): boolean;
    public delete(spec: string|Raid|Gym): boolean {
        return this.remove(spec as string).isSuccess();
    }

    public remove(name: string): Result<Raid>;
    public remove(raid: Raid): Result<Raid>;
    public remove(gym: Gym): Result<Raid>;
    public remove(spec: string|Raid|Gym): Result<Raid> {
        let raid: Raid|undefined = undefined;
        let name: string;

        if (spec instanceof Raid) {
            raid = spec;
            name = spec.keys.gymName;
        }
        else {
            name = (spec instanceof Gym) ? spec.keys.name : spec;
        }

        if (raid === undefined) {
            const result = this.getStrict(name);
            if (result.isFailure()) {
                return fail(result.message);
            }
            raid = result.value;
        }

        if (!this._map.delete(name)) {
            return fail(`No raid at ${name}`);
        }
        return succeed(raid);
    }

    public entries(): IterableIterator<[string, Raid]> {
        return this._map.entries();
    }

    public keys(): IterableIterator<string> {
        return this._map.keys();
    }

    public values(): IterableIterator<Raid> {
        return this._map.values();
    }

    public get size(): number {
        return this._map.size;
    }

    public [Symbol.iterator](): IterableIterator<[string, Raid]> {
        return this._map[Symbol.iterator]();
    }

    public get [Symbol.toStringTag](): string {
        return 'RaidMap';
    }

    public forEach(func: (elem: Raid, key: string, map: Map<string, Raid>) => void): void {
        this._map.forEach(func);
    }
}

export function raidMap(gyms: GlobalGymDirectory, bosses: BossDirectory): Converter<RaidMap> {
    return Converters.arrayOf(raid(gyms, bosses)).map(RaidMap.create);
}

export function loadRaidMapSync(path: string, gyms: GlobalGymDirectory, bosses: BossDirectory): Result<RaidMap> {
    return loadJsonFile(path).onSuccess((json) => {
        return raidMap(gyms, bosses).convert(json);
    });
}
