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

import { CommandFailureDetail, CommandResult, succeedCommand } from './commandResult';
import { Converter, DetailedResult, Result, captureResult, failWithDetail, propagateWithDetail, succeed } from '@fgv/ts-utils';

import { CommandParser } from './commandParser';

/**
 * A preprocessed command has been parsed and validated but not yet executed.
 */
export interface PreprocessedCommand<TNAME, TRET> {
    /**
     * The name of the command
     */
    readonly name: TNAME;

    /**
     * Indicates whether the command can be executed multiple times
     */
    readonly repeatable: boolean;

    /**
     * Executes the command and returns the result. If the command fails,
     * the DetailedFailure contains a CommandFailureDetail indicating the
     * source of the failure.
     */
    execute(): CommandResult<TNAME, TRET>;
}

export interface PreprocessedCommandInitializer<TNAME> {
    name: TNAME;
    repeatable: boolean;
}

export abstract class PreprocessedCommandBase<TNAME, TCTX, TPARAMS, TRET> implements PreprocessedCommand<TNAME, TRET> {
    public count = 0;
    public get name(): TNAME { return this._baseInit.name; }
    public get repeatable(): boolean { return this._baseInit.repeatable; }

    protected readonly _baseInit: PreprocessedCommandInitializer<TNAME>;
    protected readonly _context: TCTX;
    protected readonly _params: TPARAMS;

    protected constructor(init: PreprocessedCommandInitializer<TNAME>, params: TPARAMS, context: TCTX) {
        this._baseInit = init;
        this._context = context;
        this._params = params;
    }

    public execute(): CommandResult<TNAME, TRET> {
        if ((this.count > 0) && (!this._baseInit.repeatable)) {
            return failWithDetail(`Command ${this._baseInit.name} cannot be repeated`, 'execute');
        }
        this.count++;
        return this._executeAndFormat();
    }

    protected _executeAndFormat(): CommandResult<TNAME, TRET> {
        const executeResult = this._execute();
        if (executeResult.isSuccess()) {
            const getFormatResult = this._getFormat(executeResult.value);
            if (getFormatResult.isSuccess()) {
                return succeedCommand(executeResult.value, this.name, getFormatResult.value);
            }
            else {
                return failWithDetail(getFormatResult.message, 'format');
            }
        }
        return failWithDetail(executeResult.message, 'execute');
    }

    protected abstract _execute(): Result<TRET>;
    protected abstract _getFormat(val: TRET): Result<string>;
}

export type CommandFormatSelector<TPARAMS, TCTX, TRET> = (params: TPARAMS, context: TCTX, val: TRET) => Result<string>;

export interface GenericPreprocessedCommandInitializer<TNAME, TCTX, TPARAMS, TRET> extends PreprocessedCommandInitializer<TNAME> {
    execute: (params: TPARAMS, context: TCTX) => Result<TRET>;
    format: string|CommandFormatSelector<TPARAMS, TCTX, TRET>;
}

export class GenericPreprocessedCommand<TNAME, TCTX, TPARAMS, TRET> extends PreprocessedCommandBase<TNAME, TCTX, TPARAMS, TRET> {
    protected _init: GenericPreprocessedCommandInitializer<TNAME, TCTX, TPARAMS, TRET>;
    public constructor(
        init: GenericPreprocessedCommandInitializer<TNAME, TCTX, TPARAMS, TRET>,
        params: TPARAMS,
        context: TCTX
    ) {
        super(init, params, context);
        this._init = init;
    }

    public static create<TNAME, TCTX, TPARAMS, TRET>(
        init: GenericPreprocessedCommandInitializer<TNAME, TCTX, TPARAMS, TRET>,
        params: TPARAMS,
        context: TCTX
    ): Result<GenericPreprocessedCommand<TNAME, TCTX, TPARAMS, TRET>> {
        return captureResult(() => new GenericPreprocessedCommand(init, params, context));
    }

    protected _execute(): Result<TRET> {
        return this._init.execute(this._params, this._context);
    }

    protected _getFormat(val: TRET): Result<string> {
        if (typeof this._init.format === 'string') {
            return succeed(this._init.format);
        }
        return this._init.format(this._params, this._context, val);
    }
}

/**
 * A command preprocessor creates contextual PreprocessedCommands
 */
export interface CommandPreprocessor<TNAME, TCTX, TRET> {
    /**
     * Creates a PreprocessedCommand from a command string and supplied context.
     * @param command The command string to be preprocessed
     * @param context A context used to interpret the command
     * @returns A DetailedResult with a PreprocessedCommand on success or
     * an error message and CommandFailureDetail on failure.
     */
    preprocess(command: string, context: TCTX): DetailedResult<PreprocessedCommand<TNAME, TRET>, CommandFailureDetail>;
}

/**
 * Initializer for a CommandPreprocessorBase, which uses a command parser
 * and converter pair to parse and validate a command string
 */
export interface CommandPreprocessorInitializer<TTOKENS, TCTX, TPARAMS> {
    /**
     * A command parser which tokenizes a supplied command string
     */
    parser: CommandParser<TTOKENS>;

    /**
     * A generator method which yields a converter given a context.
     */
    getConverter: (context: TCTX) => Converter<TPARAMS>;
}

/**
 * Generic abstract base class for a CommandPreprocessor which uses a CommandParser
 * and Converter to parse and validate a command string.  Derived classes must
 * implement the protected _createPreprocessedCommand method to construct
 * an appropriate PreprocessedCommand from the parsed and validated command
 * plus a context.
 */
export abstract class CommandPreprocessorBase<TNAME, TTOKENS, TCTX, TPARAMS, TRET> implements CommandPreprocessor<TNAME, TCTX, TRET> {
    protected _init: CommandPreprocessorInitializer<TTOKENS, TCTX, TPARAMS>;
    protected constructor(init: CommandPreprocessorInitializer<TTOKENS, TCTX, TPARAMS>) {
        this._init = init;
    }

    /**
     * Creates a PreprocessedCommand from a command string and supplied context.
     * @param command The command string to be preprocessed
     * @param context A context used to interpret the command
     * @returns A DetailedResult with a PreprocessedCommand on success or
     * an error message and CommandFailureDetail on failure.
     */
    public preprocess(command: string, context: TCTX): DetailedResult<PreprocessedCommand<TNAME, TRET>, CommandFailureDetail> {
        const parseResult = this._init.parser.parse(command);
        if (parseResult.isFailure()) {
            return failWithDetail(parseResult.message, 'internal');
        }
        else if (parseResult.value === undefined) {
            return failWithDetail('No match', 'parse');
        }

        const parsed = parseResult.value;

        const getConverterResult = captureResult(() => this._init.getConverter(context));
        if (getConverterResult.isFailure()) {
            return failWithDetail(getConverterResult.message, 'internal');
        }
        const converter = getConverterResult.value;

        const converterResult = converter.convert(parsed);
        if (converterResult.isFailure()) {
            return failWithDetail(converterResult.message, 'validate');
        }

        const params = converterResult.value;
        return propagateWithDetail(this._createPreprocessedCommand(params, context), 'validate');
    }

    protected abstract _createPreprocessedCommand(
        params: TPARAMS,
        context: TCTX,
    ): Result<PreprocessedCommand<TNAME, TRET>>;
}

export type GenericCommandPreprocessorInitializer<TNAME, TTOKENS, TCTX, TPARAMS, TRET> =
    CommandPreprocessorInitializer<TTOKENS, TCTX, TPARAMS> & GenericPreprocessedCommandInitializer<TNAME, TCTX, TPARAMS, TRET>;

export class GenericCommandPreprocessor<TNAME, TTOKENS, TCTX, TPARAMS, TRET> extends CommandPreprocessorBase<TNAME, TTOKENS, TCTX, TPARAMS, TRET> {
    protected _commandInit: GenericPreprocessedCommandInitializer<TNAME, TCTX, TPARAMS, TRET>;

    public constructor(
        init: GenericCommandPreprocessorInitializer<TNAME, TTOKENS, TCTX, TPARAMS, TRET>,
    ) {
        super(init);
        this._commandInit = init;
    }

    public static create<TNAME, TTOKENS, TCTX, TPARAMS, TRET>(
        init: GenericCommandPreprocessorInitializer<TNAME, TTOKENS, TCTX, TPARAMS, TRET>,
    ): Result<GenericCommandPreprocessor<TNAME, TTOKENS, TCTX, TPARAMS, TRET>> {
        return captureResult(() => new GenericCommandPreprocessor(init));
    }

    protected _createPreprocessedCommand(params: TPARAMS, context: TCTX): Result<PreprocessedCommand<TNAME, TRET>> {
        return GenericPreprocessedCommand.create(this._commandInit, params, context);
    }
}
