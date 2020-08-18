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
import {
    CommandPreprocessorBase,
    CommandWithPreprocessorBase,
    ParserBuilder,
    PreprocessedCommand,
    PreprocessedCommandBase,
} from '../../../src/commands';
import { Converters, Result, captureResult, succeed } from '@fgv/ts-utils';

const word = '/\\w+/';
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

type GetCityParams = { city: string };
export class PreprocessedGetCityCommand extends PreprocessedCommandBase<PlacesCommandNames, Places, GetCityParams, City> {
    public constructor(params: GetCityParams, context: Places) {
        super('getCity', true, params, context);
    }

    protected _execute(): Result<City> {
        return this._context.getCity(this._params.city);
    }
}

export class GetCityCommandPreprocessor extends CommandPreprocessorBase<PlacesCommandNames, Tokens, Places, GetCityParams, City> {
    public constructor() {
        super({
            parser: builder.build('city {{city}}').getValueOrThrow(),
            getConverter: () => Converters.object<GetCityParams>({
                city: Converters.string,
            }),
        });
    }

    protected _createPreprocessedCommand(params: GetCityParams, context: Places): Result<PreprocessedCommand<PlacesCommandNames, City>> {
        return captureResult(() => new PreprocessedGetCityCommand(params, context));
    }
}

export class GetCityCommand extends CommandWithPreprocessorBase<PlacesCommandNames, Places, City> {
    public constructor() {
        super({
            name: 'getCity',
            description: ['Gets information about a city'],
            preprocessor: new GetCityCommandPreprocessor(),
        });
    }
}

type GetStateParams = { state: string };
export class PreprocessedGetStateCommand extends PreprocessedCommandBase<PlacesCommandNames, Places, GetStateParams, State> {
    public constructor(fields: GetStateParams, context: Places) {
        super('getState', true, fields, context);
    }

    protected _execute(): Result<State> {
        return this._context.getState(this._params.state);
    }
}

export class GetStateCommandPreprocessor extends CommandPreprocessorBase<PlacesCommandNames, Tokens, Places, GetStateParams, State> {
    public constructor() {
        super({
            parser: builder.build('state {{state}}').getValueOrThrow(),
            getConverter: () => Converters.object<GetStateParams>({
                state: Converters.string,
            }),
        });
    }

    protected _createPreprocessedCommand(params: GetStateParams, context: Places): Result<PreprocessedCommand<PlacesCommandNames, State>> {
        return captureResult(() => new PreprocessedGetStateCommand(params, context));
    }
}

export class GetStateCommand extends CommandWithPreprocessorBase<PlacesCommandNames, Places, State> {
    public constructor() {
        super({
            name: 'getState',
            description: ['Gets information about a state'],
            preprocessor: new GetStateCommandPreprocessor(),
        });
    }
}

type AddCityParams = { city: string, abbrev: string, state: State };
export class PreprocessedAddCityCommand extends PreprocessedCommandBase<PlacesCommandNames, Places, AddCityParams, City> {
    public constructor(params: AddCityParams, context: Places) {
        super('addCity', false, params, context);
    }

    protected _execute(): Result<City> {
        return this._context.addCity(this._params.city, this._params.abbrev, this._params.state);
    }
}

export class AddCityCommandPreprocessor extends CommandPreprocessorBase<PlacesCommandNames, Tokens, Places, AddCityParams, City> {
    public constructor() {
        super({
            parser: builder.build('add {{city}} = {{abbrev}} in {{state}}').getValueOrThrow(),
            getConverter: (context: Places) => Converters.object<AddCityParams>({
                city: Converters.string,
                abbrev: Converters.string,
                state: PlaceConverters.state(context),
            }),
        });
    }

    protected _createPreprocessedCommand(params: GetCityParams, context: Places): Result<PreprocessedCommand<PlacesCommandNames, City>> {
        return captureResult(() => new PreprocessedGetCityCommand(params, context));
    }
}

export class AddCityCommand extends CommandWithPreprocessorBase<PlacesCommandNames, Places, City> {
    public constructor() {
        super({
            name: 'getCity',
            description: ['Gets information about a city'],
            preprocessor: new AddCityCommandPreprocessor(),
        });
    }
}

type AddStateParams = { state: string, abbrev: string };
export class PreprocessedAddStateCommand extends PreprocessedCommandBase<PlacesCommandNames, Places, AddStateParams, State> {
    public constructor(params: AddStateParams, context: Places) {
        super('addState', false, params, context);
    }

    protected _execute(): Result<State> {
        return this._context.addState(this._params.state, this._params.abbrev);
    }
}

export class AddStateCommandPreprocessor extends CommandPreprocessorBase<PlacesCommandNames, Tokens, Places, AddStateParams, State> {
    public constructor() {
        super({
            parser: builder.build('state {{state}} == {{abbrev}}').getValueOrThrow(),
            getConverter: () => Converters.object<AddStateParams>({
                state: Converters.string,
                abbrev: Converters.string,
            }),
        });
    }

    protected _createPreprocessedCommand(params: AddStateParams, context: Places): Result<PreprocessedCommand<PlacesCommandNames, State>> {
        return captureResult(() => new PreprocessedAddStateCommand(params, context));
    }
}

export class AddStateCommand extends CommandWithPreprocessorBase<PlacesCommandNames, Places, State> {
    public constructor() {
        super({
            name: 'addState',
            description: ['Adds a state with abbreviation'],
            preprocessor: new AddStateCommandPreprocessor(),
        });
    }
}

type RemoveCityParams = { city: string };
export class PreprocessedRemoveCityCommand extends PreprocessedCommandBase<PlacesCommandNames, Places, RemoveCityParams, City> {
    public constructor(params: RemoveCityParams, context: Places) {
        super('removeCity', false, params, context);
    }

    protected _execute(): Result<City> {
        return this._context.removeCity(this._params.city);
    }
}

export class RemoveCityCommandPreprocessor extends CommandPreprocessorBase<PlacesCommandNames, Tokens, Places, RemoveCityParams, City> {
    public constructor() {
        super({
            parser: builder.build('remove city {{city}}').getValueOrThrow(),
            getConverter: () => Converters.object<RemoveCityParams>({
                city: Converters.string,
            }),
        });
    }

    protected _createPreprocessedCommand(params: RemoveCityParams, context: Places): Result<PreprocessedCommand<PlacesCommandNames, City>> {
        return captureResult(() => new PreprocessedRemoveCityCommand(params, context));
    }
}

export class RemoveCityCommand extends CommandWithPreprocessorBase<PlacesCommandNames, Places, City> {
    public constructor() {
        super({
            name: 'removeCity',
            description: ['Removes a city'],
            preprocessor: new RemoveCityCommandPreprocessor(),
        });
    }
}

type RemoveStateParams = { state: string };
export class PreprocessedRemoveStateCommand extends PreprocessedCommandBase<PlacesCommandNames, Places, RemoveStateParams, State> {
    public constructor(params: RemoveStateParams, context: Places) {
        super('removeState', false, params, context);
    }

    protected _execute(): Result<State> {
        return this._context.removeState(this._params.state);
    }
}

export class RemoveStateCommandPreprocessor extends CommandPreprocessorBase<PlacesCommandNames, Tokens, Places, GetStateParams, State> {
    public constructor() {
        super({
            parser: builder.build('remove state {{state}}').getValueOrThrow(),
            getConverter: () => Converters.object<RemoveStateParams>({
                state: Converters.string,
            }),
        });
    }

    protected _createPreprocessedCommand(params: RemoveStateParams, context: Places): Result<PreprocessedCommand<PlacesCommandNames, State>> {
        return captureResult(() => new PreprocessedRemoveStateCommand(params, context));
    }
}

export class RemoveStateCommand extends CommandWithPreprocessorBase<PlacesCommandNames, Places, State> {
    public constructor() {
        super({
            name: 'removeState',
            description: ['Removes a state'],
            preprocessor: new RemoveStateCommandPreprocessor(),
        });
    }
}

type ListParams = { listFilter?: 'cities'|'states' };
type ListResult = { cities?: City[], states?: State[] };
export class PreprocessedListCommand extends PreprocessedCommandBase<PlacesCommandNames, Places, ListParams, ListResult> {
    public constructor(params: ListParams, context: Places) {
        super('list', true, params, context);
    }

    protected _execute(): Result<ListResult> {
        let cities: City[]|undefined = undefined;
        let states: State[]|undefined = undefined;

        if ((this._params.listFilter === 'cities') || (this._params.listFilter === undefined)) {
            cities = Array.from(this._context.cities.values());
        }

        if ((this._params.listFilter === 'states') || (this._params.listFilter === undefined)) {
            states = Array.from(this._context.states.values());
        }
        return succeed({ cities, states });
    }
}

export class ListCommandPreprocessor extends CommandPreprocessorBase<PlacesCommandNames, Tokens, Places, ListParams, ListResult> {
    public constructor() {
        super({
            parser: builder.build('list {{listFilter?}}').getValueOrThrow(),
            getConverter: () => Converters.object<ListParams>({
                listFilter: Converters.enumeratedValue<'cities'|'states'>(['cities', 'states']),
            }, ['listFilter']),
        });
    }

    protected _createPreprocessedCommand(params: ListParams, context: Places): Result<PreprocessedCommand<PlacesCommandNames, ListResult>> {
        return captureResult(() => new PreprocessedListCommand(params, context));
    }
}

export class ListCommand extends CommandWithPreprocessorBase<PlacesCommandNames, Places, ListResult> {
    public constructor() {
        super({
            name: 'list',
            description: ['lists cities and/or states'],
            preprocessor: new ListCommandPreprocessor(),
        });
    }
}
