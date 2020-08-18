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

import { City, PlaceConverters, Places, State } from './places';
import { Converters, succeed } from '@fgv/ts-utils';
import { GenericCommandBase, ParserBuilder } from '../../../src/commands';

const word = '\\w+';
const words = "\\w+(?:\\s|\\w|\\d|`|'|-|\\.)*";
type Tokens = { city: string, state: string, abbrev: string, listFilter: 'cities'|'states'};
const tokens = {
    city: { value: words },
    state: { value: words },
    abbrev: { value: word },
    listFilter: { value: '(?:cities|states)' },
};
const builder = new ParserBuilder(tokens);

export type PlacesCommandNames = 'getCity'|'getState'|'addCity'|'addState'|'removeCity'|'removeState'|'list';

export function getSamplePlaces(): Places {
    const places = new Places();
    const nd = places.addState('North Dakota', 'ND').getValueOrThrow();
    const ny = places.addState('New York', 'NY').getValueOrThrow();
    const wa = places.addState('Washington', 'WA').getValueOrThrow();
    places.addCity('Bismarck', 'BIS', nd);
    places.addCity('New York', 'NYC', ny);
    places.addCity('Seattle', 'SEA', wa);
    return places;
}

class PlaceCommandBase<TPARAMS, TRET> extends GenericCommandBase<PlacesCommandNames, Tokens, Places, TPARAMS, TRET> {
}

type GetCityParams = { city: string };
const getCityParamsConverter = Converters.object<GetCityParams>({
    city: Converters.string,
});

export const getCity = new PlaceCommandBase<GetCityParams, City>({
    name: 'getCity',
    repeatable: true,
    description: ['Gets information about a city'],
    parser: builder.build('city {{city}}').getValueOrThrow(),
    getConverter: () => getCityParamsConverter,
    execute: (params: GetCityParams, context: Places) => {
        return context.getCity(params.city);
    },
});

type GetStateParams = { state: string };
export const getState = new PlaceCommandBase<GetStateParams, State>({
    name: 'getState',
    repeatable: true,
    description: ['Gets information about a state'],
    parser: builder.build('state {{state}}').getValueOrThrow(),
    getConverter: () => Converters.object<GetStateParams>({
        state: Converters.string,
    }),
    execute: (params: GetStateParams, context: Places) => {
        return context.getState(params.state);
    },
});

type AddCityParams = { city: string, abbrev: string, state: State };
export const addCity = new PlaceCommandBase<AddCityParams, City>({
    name: 'addCity',
    repeatable: false,
    description: ['Adds a city and abbreviation to a state'],
    parser: builder.build('add {{city}} = {{abbrev}} in {{state}}').getValueOrThrow(),
    getConverter: (context: Places) => Converters.object<AddCityParams>({
        city: Converters.string,
        abbrev: Converters.string,
        state: PlaceConverters.state(context),
    }),
    execute: (params: AddCityParams, context: Places) => {
        return context.addCity(params.city, params.abbrev, params.state);
    },
});

type AddStateParams = { state: string, abbrev: string };
export const addState = new PlaceCommandBase<AddStateParams, State>({
    name: 'addState',
    repeatable: false,
    description: ['Adds a state and abbreviation'],
    parser: builder.build('add {{state}} = {{abbrev}}').getValueOrThrow(),
    getConverter: () => Converters.object({
        state: Converters.string,
        abbrev: Converters.string,
    }),
    execute: (params: AddStateParams, context: Places) => {
        return context.addState(params.state, params.abbrev);
    },
});

type RemoveCityParams = { city: string };
export const removeCity = new PlaceCommandBase<RemoveCityParams, City>({
    name: 'removeCity',
    repeatable: false,
    description: ['Removes a city'],
    parser: builder.build('remove city {{city}}').getValueOrThrow(),
    getConverter: () => Converters.object({
        city: Converters.string,
    }),
    execute: (params: RemoveCityParams, context: Places) => {
        return context.removeCity(params.city);
    },
});

type RemoveStateParams = { state: string };
export const removeState = new PlaceCommandBase<RemoveStateParams, State>({
    name: 'removeState',
    repeatable: false,
    description: ['Removes a state'],
    parser: builder.build('remove state {{state}}').getValueOrThrow(),
    getConverter: () => Converters.object({
        state: Converters.string,
    }),
    execute: (params: RemoveStateParams, context: Places) => {
        return context.removeState(params.state);
    },
});

type ListParams = { listFilter?: 'cities'|'states' };
type ListResult = { cities?: City[], states?: State[] };
export const list = new PlaceCommandBase<ListParams, ListResult>({
    name: 'list',
    repeatable: false,
    description: ['Lists cities or states'],
    parser: builder.build('list {{listFilter?}}').getValueOrThrow(),
    getConverter: () => Converters.object({
        listFilter: Converters.enumeratedValue<'cities'|'states'>(['cities', 'states']),
    }, ['listFilter']),
    execute: (params: ListParams, context: Places) => {
        let cities: City[]|undefined = undefined;
        let states: State[]|undefined = undefined;

        if ((params.listFilter === 'cities') || (params.listFilter === undefined)) {
            cities = Array.from(context.cities.values());
        }

        if ((params.listFilter === 'states') || (params.listFilter === undefined)) {
            states = Array.from(context.states.values());
        }
        return succeed({ cities, states });
    },
});
