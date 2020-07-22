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
import { CommandBase, CommandInitializer, Commands } from '../../../src/commands/command';
import { CommandProperties, ParserBuilder } from '../../../src/commands/commandParser';
import { FormatTargets, Formatter } from '../../../src/utils/formatter';
import { Result, fail, succeed } from '../../../src/utils/result';
import { CommandProcessor } from '../../../src/commands/commandProcessor';

describe('CommandProcessor class', (): void => {
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

    interface TestCommands {
        specific?: string;
        general?: string;
        broken?: string;
        execFails?: string;
    }
    const testOrder: (keyof TestCommands)[] = ['specific', 'general', 'execFails', 'broken'];

    type TestSpecificFields = Required<Pick<TestFields, 'word'>>;
    type TestGeneralFields = Required<Pick<TestFields, 'testPhrase'>>;
    type TestBrokenFields = Required<Pick<TestFields, 'broken'>>;
    type TestExecFailsFields = Required<Pick<TestFields, 'word'>>;

    class TestCommand<TF> extends CommandBase<keyof TestCommands, ParsedTestFields, TF, string> {
        public constructor(init: CommandInitializer<keyof TestCommands, ParsedTestFields, TF, string>) {
            super(init);
        }

        public getDefaultFormatter(_target: FormatTargets): Result<Formatter<string|undefined>> {
            return fail('No default formatter');
        }
    }

    const testCommands: Commands<TestCommands> = {
        specific: new TestCommand<TestSpecificFields>({
            name: 'specific',
            description: 'The specific test command',
            parser: builder.build('This is a {{word}}').getValueOrThrow(),
            converter: Converters.object<TestSpecificFields>({
                word: Converters.string,
            }),
            executor: (params: TestSpecificFields): Result<string> => succeed(params.word),
            formatter: (word: string): string => `The ${word} is the word`,
        }),
        general: new TestCommand<TestGeneralFields>({
            name: 'general',
            description: 'The general test command',
            parser: builder.build('{{testPhrase}}').getValueOrThrow(),
            converter: Converters.object<TestGeneralFields>({
                testPhrase: Converters.string,
            }),
            executor: (params: TestGeneralFields): Result<string> => succeed(params.testPhrase),
            formatter: (phrase: string): string => `The test phrase is ${phrase}`,
        }),
        broken: new TestCommand<TestBrokenFields>({
            name: 'broken',
            description: 'The broken test command',
            parser: builder.build('bad {{broken}}').getValueOrThrow(),
            converter: Converters.object<TestBrokenFields>({
                broken: Converters.string,
            }),
            executor: (params: TestBrokenFields): Result<string> => succeed(params.broken),
            formatter: (word: string): string => `The bad word is ${word}`,
        }),
        execFails: new TestCommand<TestExecFailsFields>({
            name: 'execFails',
            description: 'Test command with exec failure',
            parser: builder.build('fail with {{word?}}').getValueOrThrow(),
            converter: Converters.object<TestExecFailsFields>({
                word: Converters.string,
            }, ['word']),
            executor: (params: TestExecFailsFields) => fail(params.word),
            formatter: (word: string): string => `should have failed but got ${word}`,
        }),
    };

    const commandTests = [
        {
            description: 'should succeed with no order specified',
            commands: testCommands,
            order: undefined,
        },
        {
            description: 'should succeed with an order that lists all keys',
            commands: testCommands,
            order: testOrder,
        },
        {
            description: 'should fail if order is missing any tests that are present',
            commands: testCommands,
            order: ['specific', 'general'] as (keyof TestCommands)[],
            error: /present in commands but not in evaluation order/i,
        },
        {
            description: 'should fail if order lists any keys that are missing',
            commands: { specific: testCommands.specific, general: testCommands.broken },
            order: ['specific', 'general', 'broken'] as (keyof TestCommands)[],
            error: /present in evaluation order but not in commands/i,
        },
    ];

    describe('constructor', (): void => {
        commandTests.forEach((test): void => {
            it(test.description, (): void => {
                if (test.error) {
                    expect(() =>
                        new CommandProcessor<TestCommands>(test.commands, test.order)
                    ).toThrowError(test.error);
                }
                else {
                    const cmds = new CommandProcessor<TestCommands>(test.commands, test.order);
                    expect(cmds).toBeDefined();
                }
            });
        });
    });

    describe('validateAll', (): void => {
        const cmds = new CommandProcessor<TestCommands>(testCommands, testOrder);
        it('should process only matching commands', (): void => {
            expect(cmds.validateAll('A test, this is.')).toSucceedWith(
                expect.objectContaining({
                    keys: ['general'],
                    validated: {
                        general: expect.objectContaining({ command: 'general' }),
                    },
                    validationErrors: [],
                }),
            );
        });

        it('should process all matching commands', (): void => {
            expect(cmds.validateAll('This is a test')).toSucceedWith(
                expect.objectContaining({
                    keys: ['specific', 'general'],
                    validated: {
                        general: expect.objectContaining({ command: 'general' }),
                        specific: expect.objectContaining({ command: 'specific' }),
                    },
                    validationErrors: [],
                }),
            );
        });

        it('should return an empty result if no command matches', (): void => {
            expect(cmds.validateAll('An example')).toSucceedWith({
                keys: [],
                validated: {},
                validationErrors: [],
            });
        });

        it('should fail if any of the commands fail', () => {
            expect(cmds.validateAll('bad data')).toFailWith(/mismatched capture count/i);
        });
    });

    describe('processAll', (): void => {
        const cmds = new CommandProcessor<TestCommands>(testCommands, testOrder);

        it('should process only matching commands', (): void => {
            expect(cmds.processAll('A test, this is.')).toSucceedWith({
                keys: ['general'],
                executed: {
                    general: {
                        command: 'general',
                        result: 'A test, this is.',
                        message: 'The test phrase is A test, this is.',
                    },
                },
            });
        });

        it('should process all matching commands', (): void => {
            expect(cmds.processAll('This is a test')).toSucceedWith({
                keys: ['specific', 'general'],
                executed: {
                    general: {
                        command: 'general',
                        result: 'This is a test',
                        message: 'The test phrase is This is a test',
                    },
                    specific: {
                        command: 'specific',
                        result: 'test',
                        message: 'The test is the word',
                    },
                },
            });
        });

        it('should return an empty result if no command matches', (): void => {
            expect(cmds.processAll('An example')).toSucceedWith({
                keys: [],
                executed: {},
            });
        });

        // Actually, this seems wrong. It should propagate execution errors
        it('should silently ignore failing commands if any commands pass', () => {
            expect(cmds.processAll('fail with test')).toSucceedWith({
                keys: ['general'],
                executed: {
                    general: {
                        command: 'general',
                        message: 'The test phrase is fail with test',
                        result: 'fail with test',
                    },
                },
            });
        });

        it('should fail if no commands succeed but some fail execution', () => {
            expect(cmds.processAll('fail with error')).toFailWith(/error/i);
        });

        it('should fail if any of the commands fail validation', () => {
            expect(cmds.processAll('bad data')).toFailWith(/mismatched capture count/i);
        });
    });

    describe('processFirst', (): void => {
        const cmds = new CommandProcessor(testCommands, testOrder);
        it('should process only the first matching command', (): void => {
            expect(cmds.processFirst('A test, this is.')).toSucceedWith({
                keys: ['general'],
                executed: {
                    general: {
                        command: 'general',
                        result: 'A test, this is.',
                        message: 'The test phrase is A test, this is.',
                    },
                },
            });
            expect(cmds.processFirst('This is a test')).toSucceedWith({
                keys: ['specific'],
                executed: {
                    specific: {
                        command: 'specific',
                        result: 'test',
                        message: 'The test is the word',
                    },
                },
            });
        });

        it('should fail if no command matches', (): void => {
            expect(cmds.processFirst('An example')).toFailWith(/no command matched/i);
        });

        it('should fail if the first matching command fails validation', () => {
            expect(cmds.processFirst('bad data')).toFailWith(/mismatched capture count/i);
        });

        // Actually, this seems wrong. It should propagate execution errors
        it('should silently ignore failing commands if any commands pass', () => {
            expect(cmds.processFirst('fail with test')).toSucceedWith({
                keys: ['general'],
                executed: {
                    general: {
                        command: 'general',
                        message: 'The test phrase is fail with test',
                        result: 'fail with test',
                    },
                },
            });
        });
    });

    describe('processOne', (): void => {
        const cmds = new CommandProcessor(testCommands, testOrder);
        it('should process exactly one matching command', (): void => {
            expect(cmds.processOne('A test, this is.')).toSucceedWith({
                keys: ['general'],
                executed: {
                    general: {
                        command: 'general',
                        result: 'A test, this is.',
                        message: 'The test phrase is A test, this is.',
                    },
                },
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

        it('should propagate execution errors from a single matching comand', () => {
            expect(cmds.processOne('fail with ERROR')).toFailWith('ERROR');
        });
    });
});
