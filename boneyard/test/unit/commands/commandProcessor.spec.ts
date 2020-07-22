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
import '../../helpers/jestHelpers';
import { CommandProcessor, CommandSpec } from '../../../src/commands/commandProcessor';
import { CommandProperties, ParserBuilder } from '../../../src/commands/commandParser';
import { Result, fail, succeed } from '../../../src/utils/result';

describe('commands', (): void => {
    interface TestFields {
        word: string;
        words: string;
        testPhrase: string;
        time: string;
        broken: string;
    }

    const fields: CommandProperties<TestFields> = {
        word: { value: '\\w+' },
        words: { value: '\\w+(?:\\s|\\w|\\d|`|\'|-|\\.)*' },
        testPhrase: { value: '.*test.*' },
        time: { value:  '(?:\\d?\\d):?(?:\\d\\d)\\s*(?:a|A|am|AM|p|P|pm|PM)?)', optional: false },
        broken: { value: '(\\w)(\\w)(\\w)(\\w)' },
    };
    const builder = new ParserBuilder(fields);
    const specific = builder.build('This is a {{word}}').getValueOrThrow();
    const general = builder.build('{{testPhrase}}').getValueOrThrow();
    const broken = builder.build('bad {{broken}}').getValueOrThrow();

    const goodCommands: CommandSpec<typeof fields, string|undefined>[] = [
        { name: 'Command 1', description: 'Specific command', parser: specific, handleCommand: (matches) => succeed(matches.word) },
        { name: 'Command 2', description: 'Catch all command', parser: general, handleCommand: (matches) => succeed(matches.testPhrase) },
        { name: 'Command 3', description: 'Broken command definition', parser: broken, handleCommand: (matches) => succeed(matches.broken) },
    ];
    const badCommands = {
        'missing name': {
            cmd: { description: 'Description', pattern: /^.*$/, handleCommand: (matches): string => matches },
            error: /command must have/i,
        },
        'missing description': {
            cmd: { name: 'Command', pattern: /^.*$/, handleCommand: (matches): string => matches },
            error: /command must have /i,
        },
        'missing pattern': {
            cmd: { name: 'Command', description: 'Description', handleCommand: (matches): string => matches },
            error: /command must have/i,
        },
        'missing handler': {
            cmd: { name: 'Command', description: 'Description', pattern: /^.*$/ },
            error: /command must have/i,
        },
        'non-function handleCommand': {
            cmd: { name: 'Command', description: 'Description', parser: specific, handleCommand: '(matches) => matches' },
            error: /must be a function/i,
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
            error: `Duplicate command name '${goodCommands[0].name}'.`,
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
                    expect(() => new CommandProcessor<TestFields, string|undefined>(test.cmds)).toThrowError(test.error);
                }
                else {
                    const cmds = new CommandProcessor<TestFields, string|undefined>(test.cmds);
                    expect(cmds).toBeDefined();
                    expect(cmds.numCommands).toBe((test.cmds ? test.cmds.length : 0));
                }
            });
        });
    });

    describe('addCommand', (): void => {
        it('should add valid commands', (): void => {
            const cmds = new CommandProcessor<TestFields, string|undefined>();
            expect(cmds.numCommands).toBe(0);
            cmds.addCommand(goodCommands[0]);
            expect(cmds.numCommands).toBe(1);
            cmds.addCommand(goodCommands[1]);
            expect(cmds.numCommands).toBe(2);
        });

        it('should fail to add a duplicate command', (): void => {
            const cmds = new CommandProcessor<TestFields, string|undefined>();
            expect(cmds.numCommands).toBe(0);
            cmds.addCommand(goodCommands[0]);
            expect(cmds.numCommands).toBe(1);
            expect(cmds.addCommand(goodCommands[0])).toFailWith(`Duplicate command name '${goodCommands[0].name}'.`);
            expect(cmds.numCommands).toBe(1);
        });

        describe('invalid commands', (): void => {
            const cmds = new CommandProcessor<TestFields, string>();
            for (const c in badCommands) {
                if (badCommands.hasOwnProperty(c)) {
                    it(`should fail to add a command with ${c}`, (): void => {
                        expect(cmds.addCommand(badCommands[c].cmd)).toFailWith(badCommands[c].error);
                        expect(cmds.numCommands).toBe(0);
                    });
                }
            }
        });
    });

    describe('processAll', (): void => {
        const cmds = new CommandProcessor<TestFields, string|undefined>(goodCommands);
        it('should process only matching commands', (): void => {
            expect(cmds.processAll('A test, this is.')).toSucceedWith(
                ['A test, this is.']
            );
        });
        it('should process all matching commands', (): void => {
            expect(cmds.processAll('This is a test')).toSucceedWith(
                ['test', 'This is a test']
            );
        });
        it('should return an empty array if no command matches', (): void => {
            expect(cmds.processAll('An example')).toSucceedWith([]);
        });

        it('should fail if any of the commands fail', () => {
            expect(cmds.processAll('bad data')).toFailWith(/mismatched capture count/i);
        });
    });

    describe('processFirst', (): void => {
        const cmds = new CommandProcessor(goodCommands);
        it('should process only the first matching command', (): void => {
            expect(cmds.processFirst('A test, this is.')).toSucceedWith('A test, this is.');
            expect(cmds.processFirst('This is a test')).toSucceedWith('test');
        });

        it('should fail if no command matches', (): void => {
            expect(cmds.processFirst('An example')).toFailWith(/no command matched/i);
        });

        it('should fail if the first matching command fails', () => {
            expect(cmds.processFirst('bad data')).toFailWith(/mismatched capture count/i);
        });
    });

    describe('processOne', (): void => {
        const cmds = new CommandProcessor(goodCommands);
        it('should process exactly one matching command', (): void => {
            expect(cmds.processOne('A test, this is.')).toSucceedWith('A test, this is.');
        });

        it('should fail if more than one command matches', (): void => {
            expect(cmds.processOne('This is a test')).toFailWith(/ambiguous command/i);
        });

        it('should fail if no command matches', (): void => {
            expect(cmds.processOne('An example')).toFailWith(/no command matched/i);
        });

        it('should fail if the any command fails', () => {
            expect(cmds.processOne('bad data')).toFailWith(/mismatched capture count/i);
        });
    });

    describe('with a validator', () => {
        const failTest = (c: string): Result<string> => { return c === 'test' ? fail('filtered') : succeed(c); };
        describe('processAll', (): void => {
            const cmds = new CommandProcessor<TestFields, string|undefined>(goodCommands, failTest);
            it('should process only matching commands', (): void => {
                expect(cmds.processAll('A test, this is.')).toSucceedWith(
                    ['A test, this is.']
                );
            });

            it('should process all matching commands but ignore validation errors if any succeed', (): void => {
                expect(cmds.processAll('This is a test')).toSucceedWith(
                    ['This is a test']
                );
            });

            it('should report any validation errors if all commands fail', (): void => {
                expect(cmds.processAll('test')).toFailWith(/filtered/i);
            });

            it('should return an empty array if no command matches', (): void => {
                expect(cmds.processAll('An example')).toSucceedWith([]);
            });

            it('should fail if any of the commands fail', () => {
                expect(cmds.processAll('bad data')).toFailWith(/mismatched capture count/i);
            });
        });

        describe('processFirst', (): void => {
            const cmds = new CommandProcessor(goodCommands, failTest);
            it('should process only the first matching command', (): void => {
                expect(cmds.processFirst('A test, this is.')).toSucceedWith('A test, this is.');
                expect(cmds.processFirst('This is a thing')).toSucceedWith('thing');
            });

            it('should report validation errors if no command succeeds', () => {
                expect(cmds.processFirst('test')).toFailWith(/filtered/i);
            });

            it('should fail if no command matches', (): void => {
                expect(cmds.processFirst('An example')).toFailWith(/no command matched/i);
            });

            it('should fail if the first matching command fails', () => {
                expect(cmds.processFirst('bad data')).toFailWith(/mismatched capture count/i);
            });
        });

        describe('processOne', (): void => {
            const cmds = new CommandProcessor(goodCommands, failTest);
            it('should process exactly one matching command', (): void => {
                expect(cmds.processOne('A test, this is.')).toSucceedWith('A test, this is.');
            });

            it('should report validation errors if no command succeeds', () => {
                expect(cmds.processFirst('test')).toFailWith(/filtered/i);
            });

            it('should succeed if more than one command matches but only one passes validation', (): void => {
                expect(cmds.processOne('This is a test')).toSucceedWith(expect.stringMatching('This is a test'));
            });

            it('should fail if no command matches', (): void => {
                expect(cmds.processOne('An example')).toFailWith(/no command matched/i);
            });

            it('should fail if the any command fails', () => {
                expect(cmds.processOne('bad data')).toFailWith(/mismatched capture count/i);
            });
        });
    });
});
