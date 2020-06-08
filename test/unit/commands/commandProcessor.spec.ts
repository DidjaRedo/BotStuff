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
import { CommandProcessor, CommandSpec } from '../../../src/commands/commandProcessor';

describe('commands', (): void => {
    const goodCommands: CommandSpec<string>[] = [
        { name: 'Command 1', description: 'Specific command', pattern: /^This is\s(.*)\.$/, handleCommand: (matches): string => matches[1] },
        { name: 'Command 2', description: 'Catch all command', pattern: /^.*test.*$/, handleCommand: (matches): string => matches[0] },
    ];
    const badCommands = {
        'missing name': {
            cmd: { description: 'Description', pattern: /^.*$/, handleCommand: (matches): string => matches },
            error: 'Command must have name, description, pattern and handleCommand.',
        },
        'missing description': {
            cmd: { name: 'Command', pattern: /^.*$/, handleCommand: (matches): string => matches },
            error: 'Command must have name, description, pattern and handleCommand.',
        },
        'missing pattern': {
            cmd: { name: 'Command', description: 'Description', handleCommand: (matches): string => matches },
            error: 'Command must have name, description, pattern and handleCommand.',
        },
        'missing handler': {
            cmd: { name: 'Command', description: 'Description', pattern: /^.*$/ },
            error: 'Command must have name, description, pattern and handleCommand.',
        },
        'non-regexp pattern': {
            cmd: { name: 'Command', description: 'Description', pattern: '/^.*$/', handleCommand: (matches): string => matches },
            error: 'Command.pattern must be a regular expression.',
        },
        'non-function handleCommand': {
            cmd: { name: 'Command', description: 'Description', pattern: /^.*$/, handleCommand: '(matches) => matches' },
            error: 'Command.handleCommand must be a function.',
        },
    };

    const testCommands = [
        {
            description: 'should succeed with no commands',
            cmds: undefined,
        },
        {
            description: 'should succeed with a valid command',
            cmds: [goodCommands[0]],
        },
        {
            description: 'should succeed with multiple valid commands',
            cmds: [goodCommands[0], goodCommands[1]],
        },
        {
            description: 'should fail with duplicate command names',
            cmds: [goodCommands[0], goodCommands[0]],
            error: `Duplicate command name "${goodCommands[0].name}".`,
        },
    ];

    for (const c in badCommands) {
        if (badCommands.hasOwnProperty(c)) {
            testCommands.push({
                description: `should fail with ${c}`,
                cmds: [badCommands[c].cmd],
                error: badCommands[c].error,
            });
        }
    }

    describe('constructor', (): void => {
        testCommands.forEach((test): void => {
            it(test.description, (): void => {
                if (test.error) {
                    expect(() => new CommandProcessor<string>(test.cmds)).toThrowError(test.error);
                }
                else {
                    const cmds = new CommandProcessor<string>(test.cmds);
                    expect(cmds).toBeDefined();
                    expect(cmds.numCommands).toBe((test.cmds ? test.cmds.length : 0));
                }
            });
        });
    });

    describe('addCommand', (): void => {
        it('should add valid commands', (): void => {
            const cmds = new CommandProcessor();
            expect(cmds.numCommands).toBe(0);
            cmds.addCommand(goodCommands[0]);
            expect(cmds.numCommands).toBe(1);
            cmds.addCommand(goodCommands[1]);
            expect(cmds.numCommands).toBe(2);
        });

        it('should fail to add a duplicate command', (): void => {
            const cmds = new CommandProcessor();
            expect(cmds.numCommands).toBe(0);
            cmds.addCommand(goodCommands[0]);
            expect(cmds.numCommands).toBe(1);
            expect(
                (): void => cmds.addCommand(goodCommands[0])
            ).toThrowError(`Duplicate command name "${goodCommands[0].name}".`);
            expect(cmds.numCommands).toBe(1);
        });

        describe('invalid commands', (): void => {
            const cmds = new CommandProcessor();
            for (const c in badCommands) {
                if (badCommands.hasOwnProperty(c)) {
                    it(`should fail to add a command with ${c}`, (): void => {
                        expect((): void => cmds.addCommand(badCommands[c].cmd)).toThrowError(badCommands[c].error);
                        expect(cmds.numCommands).toBe(0);
                    });
                }
            }
        });
    });

    describe('processAll', (): void => {
        const cmds = new CommandProcessor(goodCommands);
        it('should process only matching commands', (): void => {
            const result = cmds.processAll('A test, this is.');
            expect(result.length).toBe(1);
            expect(result[0]).toBe('A test, this is.');
        });
        it('should process all matching commands', (): void => {
            const result = cmds.processAll('This is a test.');
            expect(result.length).toBe(2);
            expect(result[0]).toBe('a test');
            expect(result[1]).toBe('This is a test.');
        });
        it('should return an empty array if no command matches', (): void => {
            const result = cmds.processAll('An example');
            expect(result.length).toBe(0);
        });
    });

    describe('processFirst', (): void => {
        const cmds = new CommandProcessor(goodCommands);
        it('should process only the first matching command', (): void => {
            let result = cmds.processFirst('A test, this is.');
            expect(result.found).toBe(true);
            expect(result.result).toBe('A test, this is.');

            result = cmds.processFirst('This is a test.');
            expect(result.found).toBe(true);
            expect(result.result).toBe('a test');
        });

        it('should return found===false if no command matches', (): void => {
            const result = cmds.processFirst('An example');
            expect(result.found).toBe(false);
            expect(result.result).toBeUndefined();
        });
    });

    describe('processOne', (): void => {
        const cmds = new CommandProcessor(goodCommands);
        it('should process exactly one matching command', (): void => {
            const result = cmds.processOne('A test, this is.');
            expect(result.found).toBe(true);
            expect(result.result).toBe('A test, this is.');
        });

        it('should throw if more than one command matches', (): void => {
            expect((): void => {
                cmds.processOne('This is a test.');
            }).toThrowError('Ambiguous command "This is a test." could be "Command 1" or "Command 2".');
        });

        it('should return found===false if no command matches', (): void => {
            const result = cmds.processFirst('An example');
            expect(result.found).toBe(false);
            expect(result.result).toBeUndefined();
        });
    });
});
