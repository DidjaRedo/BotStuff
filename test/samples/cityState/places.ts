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

import { Converter, Result, allSucceed, fail, succeed } from '@fgv/ts-utils';

export interface City {
    name: string;
    abbrev: string;
    state: string;
}

export interface State {
    name: string;
    abbrev: string;
    cities: City[];
}

export class Places {
    public readonly cities: Map<string, City> = new Map<string, City>();
    public readonly states: Map<string, State> = new Map<string, State>();

    public getCity(name: string): Result<City> {
        const city = this.cities.get(name);
        if (city === undefined) {
            return fail(`Unknown city "${name}"`);
        }
        return succeed(city);
    }

    public getState(name: string): Result<State> {
        const state = this.states.get(name);
        if (state === undefined) {
            return fail(`Unknown state "${name}"`);
        }
        return succeed(state);
    }

    public addState(name: string, abbrev: string): Result<State> {
        if (this.states.has(name)) {
            return fail(`State ${name} already exists`);
        }
        const state = { name, abbrev, cities: [] };
        this.states.set(name, state);
        return succeed(state);
    }

    public addCity(name: string, abbrev: string, state: State): Result<City> {
        if (this.cities.has(name)) {
            return fail(`City ${name} already exists`);
        }
        if (this.states.get(state.name) !== state) {
            return fail(`State ${name} missing or mismatched`);
        }

        const city = { name, abbrev, state: state.name };
        this.cities.set(name, city);
        state.cities.push(city);
        return succeed(city);
    }

    public removeState(name: string): Result<State> {
        const state = this.states.get(name);
        if (state === undefined) {
            return fail(`Cannot remove state ${name}: not found`);
        }

        return allSucceed(state.cities.map((city) => {
            if (this.cities.get(city.name) !== city) {
                return fail(`Missing or mismatched city ${city.name} for state ${state.name}`);
            }
            return succeed(city);
        }), true).onSuccess(() => {
            this.states.delete(name);
            state.cities.forEach((city) => this.cities.delete(city.name));
            return succeed(state);
        });
    }

    public removeCity(name: string): Result<City> {
        const city = this.cities.get(name);
        if (city === undefined) {
            return fail(`Cannot remove city ${name}: not found`);
        }

        const state = this.states.get(city.state);
        if (state === undefined) {
            return fail(`Cannot remove city ${name}: state ${city.state} not found`);
        }

        const index = state.cities.indexOf(city);
        if (index < 0) {
            return fail(`Cannot remove city ${name}: Not present in ${city.state}`);
        }

        this.cities.delete(name);
        state.cities.splice(index, 1);
        return succeed(city);
    }
}

export abstract class PlaceConverters {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() {}

    public static city(places: Places): Converter<City> {
        return new Converter((from: unknown) => {
            if (typeof from === 'string') {
                return places.getCity(from);
            }
            return fail(`Cannot convert non-string ${JSON.stringify(from)} to city`);
        });
    }

    public static state(places: Places): Converter<State> {
        return new Converter((from: unknown) => {
            if (typeof from === 'string') {
                return places.getState(from);
            }
            return fail(`Cannot convert non-string ${JSON.stringify(from)} to state`);
        });
    }
}
