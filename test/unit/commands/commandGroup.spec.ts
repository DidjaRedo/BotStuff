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
import * as Converters from '../../../src/utils/converters';
import { CommandBase, CommandInitializer } from '../../../src/commands/command';
import { CommandProperties, ParserBuilder } from '../../../src/commands/commandParser';
import { FormatTargets, Formatter } from '../../../src/utils/formatter';
import { Result, fail, succeed } from '../../../src/utils/result';
import { CommandGroup } from '../../../src/commands/commandGroup';

describe('CommandGroup class', (): void => {
    interface TestFields {
        word: string;
        words: string;
        testPhrase: string;
        time: string;
        broken: string;
    }
    type ParsedTestFields = Record<keyof TestFields, string|number|Date>;

    const fields: CommandProperties<TestFields> = {
        word: { value: '\\w+' },
        words: { value: '\\w+(?:\\s|\\w|\\d|`|\'|-|\\.)*' },
        testPhrase: { value: '.*test.*' },
        time: { value:  '(?:\\d?\\d):?(?:\\d\\d)\\s*(?:a|A|am|AM|p|P|pm|PM)?)', optional: false },
        broken: { value: '(\\w)(\\w)(\\w)(\\w)' },
    };
    const builder = new ParserBuilder(fields);

    type TestCommandType = 'specific'|'general'|'broken';

    class TestCommand<TF> extends CommandBase<TestCommandType, ParsedTestFields, TF, string> {
        public constructor(init: CommandInitializer<TestCommandType, ParsedTestFields, TF, string>) {
            super(init);
        }

        public getDefaultFormatter(_target: FormatTargets): Result<Formatter<string>> {
            return fail('No default formatter');
        }
    }

    type TestSpecificFields = Required<Pick<TestFields, 'word'>>;
    const specific = new TestCommand<TestSpecificFields>({
        name: 'specific',
        description: 'The specific test command',
        parser: builder.build('This is a {{word}}').getValueOrThrow(),
        converter: Converters.object<TestSpecificFields>({
            word: Converters.string,
        }),
        executor: (params: TestSpecificFields): Result<string> => succeed(params.word),
        formatter: (word: string): string => `The ${word} is the word`,
    });

    type TestGeneralFields = Required<Pick<TestFields, 'testPhrase'>>;
    const general = new TestCommand<TestGeneralFields>({
        name: 'general',
        description: 'The general test command',
        parser: builder.build('{{testPhrase}}').getValueOrThrow(),
        converter: Converters.object<TestGeneralFields>({
            testPhrase: Converters.string,
        }),
        executor: (params: TestGeneralFields): Result<string> => succeed(params.testPhrase),
        formatter: (phrase: string): string => `The test phrase is ${phrase}`,
    });

    type TestBrokenFields = Required<Pick<TestFields, 'broken'>>;
    const broken = new TestCommand<TestBrokenFields>({
        name: 'broken',
        description: 'The broken test command',
        parser: builder.build('bad {{broken}}').getValueOrThrow(),
        converter: Converters.object<TestBrokenFields>({
            broken: Converters.string,
        }),
        executor: (params: TestBrokenFields): Result<string> => succeed(params.broken),
        formatter: (word: string): string => `The bad word is ${word}`,
    });

    const goodCommands = [
        specific,
        general,
        broken,
    ];

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
            error: /duplicate command name/i,
        },
    ];

    describe('constructor', (): void => {
        testCommands.forEach((test): void => {
            it(test.description, (): void => {
                if (test.error) {
                    expect(() => new CommandGroup<TestCommandType, string>(test.cmds)).toThrowError(test.error);
                }
                else {
                    const cmds = new CommandGroup<TestCommandType, string>(test.cmds);
                    expect(cmds).toBeDefined();
                    expect(cmds.numCommands).toBe((test.cmds ? test.cmds.length : 0));
                }
            });
        });
    });

    describe('addCommand', (): void => {
        it('should add valid commands', (): void => {
            const cmds = new CommandGroup<TestCommandType, string>();
            expect(cmds.numCommands).toBe(0);
            expect(cmds.addCommand(goodCommands[0])).toSucceedWith(true);
            expect(cmds.numCommands).toBe(1);
            expect(cmds.addCommand(goodCommands[1])).toSucceedWith(true);
            expect(cmds.numCommands).toBe(2);
        });

        it('should fail to add a duplicate command', (): void => {
            const cmds = new CommandGroup<TestCommandType, string>();
            expect(cmds.numCommands).toBe(0);
            expect(cmds.addCommand(goodCommands[0])).toSucceedWith(true);
            expect(cmds.numCommands).toBe(1);
            expect(cmds.addCommand(goodCommands[0])).toFailWith(/duplicate command name/i);
            expect(cmds.numCommands).toBe(1);
        });
    });

    describe('couldBeCommand method', () => {
        it('should return true for commands with the expected prefix', () => {
            const cmds = new CommandGroup<TestCommandType, string>(undefined, '!foo');
            expect(cmds.couldBeCommand('!foo test')).toBe(true);
        });

        it('should return false for commands without the expected prefix', () => {
            const cmds = new CommandGroup<TestCommandType, string>(undefined, '!foo');
            [
                '!food test',
                '!fo test',
                'foo test',
            ].forEach((t) => {
                expect(cmds.couldBeCommand(t)).toBe(false);
            });
        });

        it('should always return true for a command with no prefix', () => {
            const cmds = new CommandGroup<TestCommandType, string>();
            [
                '!foo test',
                '',
                'this is a string',
            ].forEach((t) => {
                expect(cmds.couldBeCommand(t)).toBe(true);
            });
        });
    });

    describe('validateAll', (): void => {
        const cmds = new CommandGroup<TestCommandType, string>(goodCommands);
        it('should process only matching commands', (): void => {
            expect(cmds.validateAll('A test, this is.')).toSucceedWith([
                expect.objectContaining({ command: 'general' }),
            ]);
        });

        it('should process all matching commands', (): void => {
            expect(cmds.validateAll('This is a test')).toSucceedWith([
                expect.objectContaining({ command: 'specific' }),
                expect.objectContaining({ command: 'general' }),
            ]);
        });

        it('should return an empty array if no command matches', (): void => {
            expect(cmds.validateAll('An example')).toSucceedWith([]);
        });

        it('should fail if any of the commands fail', () => {
            expect(cmds.validateAll('bad data')).toFailWith(/mismatched capture count/i);
        });
    });

    describe('processAll', (): void => {
        const cmds = new CommandGroup<TestCommandType, string>(goodCommands);
        it('should process only matching commands', (): void => {
            expect(cmds.processAll('A test, this is.')).toSucceedWith([{
                command: 'general',
                result: 'A test, this is.',
                message: 'The test phrase is A test, this is.',
            }]);
        });

        it('should process all matching commands', (): void => {
            expect(cmds.processAll('This is a test')).toSucceedWith([
                {
                    command: 'specific',
                    result: 'test',
                    message: 'The test is the word',
                },
                {
                    command: 'general',
                    result: 'This is a test',
                    message: 'The test phrase is This is a test',
                },
            ]);
        });

        it('should return an empty array if no command matches', (): void => {
            expect(cmds.processAll('An example')).toSucceedWith([]);
        });

        it('should fail if any of the commands fail', () => {
            expect(cmds.processAll('bad data')).toFailWith(/mismatched capture count/i);
        });
    });

    describe('processFirst', (): void => {
        const cmds = new CommandGroup(goodCommands);
        it('should process only the first matching command', (): void => {
            expect(cmds.processFirst('A test, this is.')).toSucceedWith({
                command: 'general',
                result: 'A test, this is.',
                message: 'The test phrase is A test, this is.',
            });
            expect(cmds.processFirst('This is a test')).toSucceedWith({
                command: 'specific',
                result: 'test',
                message: 'The test is the word',
            });
        });

        it('should fail if no command matches', (): void => {
            expect(cmds.processFirst('An example')).toFailWith(/no command matched/i);
        });

        it('should fail if the first matching command fails', () => {
            expect(cmds.processFirst('bad data')).toFailWith(/mismatched capture count/i);
        });
    });

    describe('processOne', (): void => {
        const cmds = new CommandGroup(goodCommands);
        it('should process exactly one matching command', (): void => {
            expect(cmds.processOne('A test, this is.')).toSucceedWith({
                command: 'general',
                result: 'A test, this is.',
                message: 'The test phrase is A test, this is.',
            });
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
});
