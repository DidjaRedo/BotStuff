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

import { CommandProcessor, CommandSpec } from '../../commands/commandProcessor';
import { Result, fail } from '../../utils/result';
import { PogoCommandHandler } from './common';
import { RaidLookupOptions } from '../raidDirectory';
import { RaidManager } from '../raidManager';

export interface RaidManagerCommandHandler<T> extends PogoCommandHandler {
    validate(rm: RaidManager): Result<T>;
}

export class RaidManagerCommandProcessor<TF, TP extends RaidManagerCommandHandler<TP>> {
    public prefix: string;
    private _rm: RaidManager;
    private _commands: CommandProcessor<TF, TP>;

    protected constructor(rm: RaidManager, prefix: string, commands: CommandSpec<TF, TP>[]) {
        this.prefix = prefix;
        this._rm = rm;
        this._commands = new CommandProcessor(commands, (c) => c.validate(this._rm));
    }

    public isCommand(command: string): boolean {
        return command.trim().startsWith(this.prefix);
    }

    public parseCommand(command: string): Result<TP> {
        if (!this.isCommand(command)) {
            return fail(`Not an ${this.prefix} command: ${command}`);
        }
        return this._commands.processOne(command);
    }

    public handleCommand(command: string, options?: RaidLookupOptions): Result<string> {
        return this.parseCommand(command).onSuccess((handler) => {
            return handler.execute(this._rm, options);
        });
    }
}
