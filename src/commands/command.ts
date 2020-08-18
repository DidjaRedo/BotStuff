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

import { CommandFailureDetail, CommandResult } from './commandResult';
import {
    CommandPreprocessor,
    GenericCommandPreprocessor,
    GenericCommandPreprocessorInitializer,
    PreprocessedCommand,
} from './preprocessedCommand';
import {
    DetailedResult,
    FormatTargets,
    Formatter,
    Result,
    captureResult,
    fail,
    failWithDetail,
} from '@fgv/ts-utils';

/**
 * Help descriptions for a single command
 */
export interface CommandHelp {
    /**
     * Gets one or more lines describing the command
     */
    getDescription(): string[];

    /**
     * Gets zero or more lines providing examples of the command
     */
    getExamples(): string[];

    /**
     * Gets zero or more lines to be displayed after the examples
     */
    getFooter(): string[];

    /**
     * Gets a full description of the command
     */
    getHelpText(): string[];
}

/**
 * Initialize a CommandHelpBase object
 */
export interface CommandHelpInitializer {
    description: string[];
    examples?: string[];
    footer?: string[];
}

/**
 * Simple implementation of CommandHelp using a basic
 * initializer.
 */
export class CommandHelpBase {
    protected _init: CommandHelpInitializer;

    public constructor(init: CommandHelpInitializer) {
        this._init = init;
    }

    public getDescription(): string[] {
        return this._init.description;
    }

    public getExamples(): string[] {
        return this._init.examples ?? [];
    }

    public getFooter(): string[] {
        return this._init.footer ?? [];
    }

    public getHelpText(): string[] {
        return [
            ...this._init.description,
            ...this._init.examples ?? [],
            ...this._init.footer ?? [],
        ];
    }
}

/**
 * A single, named executable command
 */
export interface Command<TNAME, TCTX, TRET> {
    /**
     * The name of the command
     */
    readonly name: TNAME;

    /**
     * Gets help for the command
     */
    readonly help: CommandHelp;

    /**
     * Preprocesses the specified string against the supplied context
     * @param command The command string to be preprocessed
     * @param context The context against which the string is to be preproprocessed
     *
     * @returns Success if the command was preprocessed and is ready for execution,
     * failure if the command failed.  The returned detail 'parse' indicates that
     * the supplied command does not match the command syntactically, while 'validate'
     * indicates that the command matches syntactically but that one or more of the tokens
     * failed validation.  A detail of 'internal' indicates that some other internal
     * error occurred.
     */
    preprocess(command: string, context: TCTX): DetailedResult<PreprocessedCommand<TNAME, TRET>, CommandFailureDetail>;

    /**
     * Executes the specified string against the supplied context
     * @param command The command string to be preprocessed
     * @param context The context against which the string is to be preproprocessed
     *
     * @returns Success with the resulting object if the command was executed successfully,
     * failure if the command failed.  The returned detail 'parse' indicates that
     * the supplied command does not match the command syntactically, while 'validate'
     * indicates that the command matches syntactically but that one or more of the tokens
     * failed validation. A detail of 'execute' indicates that the command validated correctly
     * but failed to execute, while a detail of 'internal' indicates that some other internal
     * error occurred.
     */
    execute(command: string, context: TCTX): CommandResult<TNAME, TRET>;

    /**
     * Formats a successful command result using the supplied formatter, or returns failure
     * and propagates the error message from a failed command.
     * @param result The result of command execution
     * @param formatter The formatter to use for a successful result
     */
    format(result: CommandResult<TNAME, TRET>, formatter: Formatter<TRET>): Result<string>;

    /**
     * Gets the default formatter for this command for a supplied format target
     * @param target The FormatTarget for which the formatter is to be returned
     */
    getDefaultFormatter(target: FormatTargets): Result<Formatter<TRET>>;
}

export interface CommandInitializer<TNAME> extends CommandHelpInitializer {
    name: TNAME;
}

/**
 * Abstract base class with a generic implementation of Command using static
 * initializer.  Derived classes must implement the preprocess method to
 * create an appropriate PreprocessedCommand.
 */
export abstract class CommandBase<TNAME, TCTX, TRET> implements Command<TNAME, TCTX, TRET> {
    public readonly name: TNAME;
    public readonly help: CommandHelp;

    protected constructor(init: CommandInitializer<TNAME>) {
        this.name = init.name;
        this.help = new CommandHelpBase(init);
    }

    public execute(command: string, context: TCTX): CommandResult<TNAME, TRET> {
        const preprocessResult = this.preprocess(command, context);
        if (preprocessResult.isSuccess()) {
            return preprocessResult.value.execute();
        }
        return failWithDetail(preprocessResult.message, preprocessResult.detail);
    }

    public format(result: CommandResult<TNAME, TRET>, formatter: Formatter<TRET>): Result<string> {
        if (result.isSuccess()) {
            return formatter(result.format, result.value);
        }
        return fail(result.message);
    }

    public abstract preprocess(command: string, context: TCTX): DetailedResult<PreprocessedCommand<TNAME, TRET>, CommandFailureDetail>;
    public abstract getDefaultFormatter(target: FormatTargets): Result<Formatter<TRET>>;
}

/**
 * Initializer for CommandWithPreprocessorBase, which takes all of the command initializer
 * properties plus static preprocessor (a preprocessor that does not depend on the value
 * of context).
 */
export interface CommandWithPreprocessorInitializer<TNAME, TCTX, TRET> extends CommandInitializer<TNAME> {
    preprocessor: CommandPreprocessor<TNAME, TCTX, TRET>;
    getDefaultFormatter?: (target: FormatTargets) => Result<Formatter<TRET>>;
}

/**
 * Generic implementation of Command using a static initializer and a supplied preprocessor.
 * Preprocessor is reused and cannot vary with context.
 */
export class CommandWithPreprocessorBase<TNAME, TCTX, TRET> extends CommandBase<TNAME, TCTX, TRET> {
    protected readonly _preprocessor: CommandPreprocessor<TNAME, TCTX, TRET>;
    protected readonly _getFormatter?: (target: FormatTargets) => Result<Formatter<TRET>>;

    public constructor(init: CommandWithPreprocessorInitializer<TNAME, TCTX, TRET>) {
        super(init);
        this._preprocessor = init.preprocessor;
        this._getFormatter = init.getDefaultFormatter;
    }

    public preprocess(command: string, context: TCTX): DetailedResult<PreprocessedCommand<TNAME, TRET>, CommandFailureDetail> {
        return this._preprocessor.preprocess(command, context);
    }

    public getDefaultFormatter(target: FormatTargets): Result<Formatter<TRET>> {
        if (!this._getFormatter) {
            return fail(`Command ${this.name} has no formatter factory.`);
        }
        return this._getFormatter(target);
    }
}

export interface GenericCommandInitializer<TNAME, TTOKENS, TCTX, TPARAMS, TRET>
    extends CommandInitializer<TNAME>, GenericCommandPreprocessorInitializer<TNAME, TTOKENS, TCTX, TPARAMS, TRET>
{
    getDefaultFormatter?: (target: FormatTargets) => Result<Formatter<TRET>>;
}

export class GenericCommand<TNAMES, TTOKENS, TCTX, TPARAMS, TRET> extends CommandWithPreprocessorBase<TNAMES, TCTX, TRET> {
    public constructor(init: GenericCommandInitializer<TNAMES, TTOKENS, TCTX, TPARAMS, TRET>) {
        super({
            ...init,
            preprocessor: new GenericCommandPreprocessor(init),
        });
    }

    public static create<TNAMES, TTOKENS, TCTX, TPARAMS, TRET>(
        init: GenericCommandInitializer<TNAMES, TTOKENS, TCTX, TPARAMS, TRET>,
    ): Result<GenericCommand<TNAMES, TTOKENS, TCTX, TPARAMS, TRET>> {
        return captureResult(() => new GenericCommand(init));
    }
}
