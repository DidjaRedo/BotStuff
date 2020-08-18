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
import '@fgv/ts-utils-jest';
import * as Converters from '@fgv/ts-utils/converters';
import { CommandBase, CommandGroup, CommandInitializer } from '../../../src/commandsv1';
import { CommandProperties, ParserBuilder } from '../../../src/commands/commandParser';
import {
    FormatTargets,
    Formatter,
    Result,
    fail,
    succeed,
} from '@fgv/ts-utils';

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
            description: 'succeeds with no commands',
            cmds: undefined,
        },
        {
            description: 'succeeds with a valid command',
            cmds: [goodCommands[0]],
        },
        {
            description: 'succeeeds with multiple valid commands',
            cmds: [goodCommands[0], goodCommands[1]],
        },
        {
            description: 'fails with duplicate command names',
            cmds: [goodCommands[0], goodCommands[0]],
            error: /duplicate command name/i,
        },
    ];

    describe('constructor', (): void => {
        testCommands.forEach((t): void => {
            test(t.description, (): void => {
                if (t.error) {
                    expect(() => new CommandGroup<TestCommandType, string>(t.cmds)).toThrowError(t.error);
                }
                else {
                    const cmds = new CommandGroup<TestCommandType, string>(t.cmds);
                    expect(cmds).toBeDefined();
                    expect(cmds.numCommands).toBe((t.cmds ? t.cmds.length : 0));
                }
            });
        });
    });

    describe('addCommand', (): void => {
        test('adds valid commands', (): void => {
            const cmds = new CommandGroup<TestCommandType, string>();
            expect(cmds.numCommands).toBe(0);
            expect(cmds.addCommand(goodCommands[0])).toSucceedWith(true);
            expect(cmds.numCommands).toBe(1);
            expect(cmds.addCommand(goodCommands[1])).toSucceedWith(true);
            expect(cmds.numCommands).toBe(2);
        });

        test('fails to add a duplicate command', (): void => {
            const cmds = new CommandGroup<TestCommandType, string>();
            expect(cmds.numCommands).toBe(0);
            expect(cmds.addCommand(goodCommands[0])).toSucceedWith(true);
            expect(cmds.numCommands).toBe(1);
            expect(cmds.addCommand(goodCommands[0])).toFailWith(/duplicate command name/i);
            expect(cmds.numCommands).toBe(1);
        });
    });

    describe('couldBeCommand method', () => {
        test('returns true for commands with the expected prefix', () => {
            const cmds = new CommandGroup<TestCommandType, string>(undefined, '!foo');
            expect(cmds.couldBeCommand('!foo test')).toBe(true);
        });

        test('returns false for commands without the expected prefix', () => {
            const cmds = new CommandGroup<TestCommandType, string>(undefined, '!foo');
            [
                '!food test',
                '!fo test',
                'foo test',
            ].forEach((t) => {
                expect(cmds.couldBeCommand(t)).toBe(false);
            });
        });

        test('returns true for a command with no prefix', () => {
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
        test('processes only matching commands', (): void => {
            expect(cmds.validateAll('A test, this is.')).toSucceedWith([
                expect.objectContaining({ command: 'general' }),
            ]);
        });

        test('processes all matching commands', (): void => {
            expect(cmds.validateAll('This is a test')).toSucceedWith([
                expect.objectContaining({ command: 'specific' }),
                expect.objectContaining({ command: 'general' }),
            ]);
        });

        test('returns an empty array if no command matches', (): void => {
            expect(cmds.validateAll('An example')).toSucceedWith([]);
        });

        test('fails if any of the commands fail', () => {
            expect(cmds.validateAll('bad data')).toFailWith(/mismatched capture count/i);
        });
    });

    describe('processAll', (): void => {
        const cmds = new CommandGroup<TestCommandType, string>(goodCommands);
        test('processes only matching commands', (): void => {
            expect(cmds.processAll('A test, this is.')).toSucceedWith([{
                command: 'general',
                result: 'A test, this is.',
                message: 'The test phrase is A test, this is.',
            }]);
        });

        test('processes all matching commands', (): void => {
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

        test('returns an empty array if no command matches', (): void => {
            expect(cmds.processAll('An example')).toSucceedWith([]);
        });

        test('fails if any of the commands fail', () => {
            expect(cmds.processAll('bad data')).toFailWith(/mismatched capture count/i);
        });
    });

    describe('processFirst', (): void => {
        const cmds = new CommandGroup(goodCommands);
        test('processes only the first matching command', (): void => {
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

        test('fails if no command matches', (): void => {
            expect(cmds.processFirst('An example')).toFailWith(/no command matched/i);
        });

        test('fails if the first matching command fails', () => {
            expect(cmds.processFirst('bad data')).toFailWith(/mismatched capture count/i);
        });
    });

    describe('processOne', (): void => {
        const cmds = new CommandGroup(goodCommands);
        test('processes exactly one matching command', (): void => {
            expect(cmds.processOne('A test, this is.')).toSucceedWith({
                command: 'general',
                result: 'A test, this is.',
                message: 'The test phrase is A test, this is.',
            });
        });

        test('fails if more than one command matches', (): void => {
            expect(cmds.processOne('This is a test')).toFailWith(/ambiguous command/i);
        });

        test('fails if no command matches', (): void => {
            expect(cmds.processOne('An example')).toFailWith(/no command matched/i);
        });

        test('fails if the any command fails', () => {
            expect(cmds.processOne('bad data')).toFailWith(/mismatched capture count/i);
        });
    });
});
