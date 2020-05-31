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

export interface CommandResult {
    found: boolean;
    result: true;
}

export type CommandHandler = (params: object) => object;

export interface CommandSpec {
    name: string;
    description: string;
    pattern: RegExp;
    handleCommand: CommandHandler;
}

export class CommandProcessor {
    public constructor(commands?: CommandSpec[]) {
        this._commands = [];

        if (commands) {
            commands.forEach((c): void => this.addCommand(c));
        }
    }

    private _commands: CommandSpec[];

    private _validateCommand(cmd: CommandSpec): void {
        if ((!cmd.name) || (!cmd.description) || (!cmd.pattern) || (!cmd.handleCommand)) {
            throw new Error('Command must have name, description, pattern and handleCommand.');
        }

        if ((cmd.pattern instanceof RegExp) !== true) {
            throw new Error('Command.pattern must be a regular expression.');
        }

        if (typeof cmd.handleCommand !== 'function') {
            throw new Error('Command.handleCommand must be a function.');
        }

        this._commands.forEach((c): void => {
            if (c.name === cmd.name) {
                throw new Error(`Duplicate command name "${c.name}".`);
            }
        });
    }

    public addCommand(cmd: CommandSpec): void {
        this._validateCommand(cmd);
        this._commands.push(cmd);
    }

    public processAll(message): object[] {
        const results = [];
        this._commands.forEach((c): void => {
            const params = message.match(c.pattern);
            if (params !== null) {
                results.push(c.handleCommand(params));
            }
        });
        return results;
    }

    public processFirst(message): CommandResult {
        const result = {
            found: false,
            result: undefined,
        };

        this._commands.forEach((c): object => {
            if (!result.found) {
                const params = message.match(c.pattern);
                if (params !== null) {
                    result.result = c.handleCommand(params);
                    result.found = true;
                }
            }
            return result;
        });

        return result;
    }

    public processOne(message): CommandResult {
        const result = {
            found: false,
            result: undefined,
        };
        let firstCommand = undefined;

        this._commands.forEach((c): void => {
            const params = message.match(c.pattern);
            if (params !== null) {
                if (!result.found) {
                    firstCommand = c;
                    result.result = c.handleCommand(params);
                    result.found = true;
                }
                else {
                    throw new Error(`Ambiguous command "${message}" could be "${firstCommand.name}" or "${c.name}".`);
                }
            }
        });

        return result;
    }

    public get numCommands(): number {
        return this._commands.length;
    }
}
