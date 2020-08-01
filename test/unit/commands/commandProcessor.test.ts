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
import {
    CommandBase,
    CommandInitializer,
    CommandProcessor,
    CommandProperties,
    Commands,
    ParserBuilder,
    PreProcessedCommand,
    ResultFormatters,
} from '../../../src/commands';
import { FormatTargets, Formatter, Result, fail, succeed } from '@fgv/ts-utils';

describe('CommandProcessor class', (): void => {
    interface TestFields {
        word: string;
        words: string;
        testPhrase: string;
        time: string;
        broken: string;
    }
    type ParsedTestFields = Record<keyof TestFields, string | number | Date>;

    const fields: CommandProperties<TestFields> = {
        word: { value: '\\w+' },
        words: { value: "\\w+(?:\\s|\\w|\\d|`|'|-|\\.)*" },
        testPhrase: { value: '.*test.*' },
        time: {
            value: '(?:\\d?\\d):?(?:\\d\\d)\\s*(?:a|A|am|AM|p|P|pm|PM)?)',
            optional: false,
        },
        broken: { value: '(\\w)(\\w)(\\w)(\\w)' },
    };
    const builder = new ParserBuilder(fields);

    interface TestCommands {
        specific?: string;
        general?: string;
        broken?: string;
        execFails?: string;
    }

    const testOrder: (keyof TestCommands)[] = [
        'specific',
        'general',
        'execFails',
        'broken',
    ];

    type TestSpecificFields = Required<Pick<TestFields, 'word'>>;
    type TestGeneralFields = Required<Pick<TestFields, 'testPhrase'>>;
    type TestBrokenFields = Required<Pick<TestFields, 'broken'>>;
    type TestExecFailsFields = Required<Pick<TestFields, 'word'>>;

    function testStringFormatter(
        format: string,
        _value?: string
    ): Result<string> {
        return succeed(format);
    }

    class TestCommand<TF> extends CommandBase<
        keyof TestCommands,
        ParsedTestFields,
        TF,
        string
        > {
        public constructor(
            init: CommandInitializer<keyof TestCommands, ParsedTestFields, TF, string>
        ) {
            super(init);
        }

        public getDefaultFormatter(
            _target: FormatTargets
        ): Result<Formatter<string | undefined>> {
            return succeed(testStringFormatter);
        }
    }

    const testCommands: Commands<TestCommands> = {
        specific: new TestCommand<TestSpecificFields>({
            name: 'specific',
            description: 'The specific test command',
            examples: ['  This is a test', '  This is a sentence'],
            parser: builder.build('This is a {{word}}').getValueOrThrow(),
            converter: Converters.object<TestSpecificFields>({
                word: Converters.string.withConstraint((v: string): Result<string> => {
                    if (v === 'disallowed') {
                        return fail('disallowed is not allowed');
                    }
                    return succeed(v);
                }),
            }),
            executor: (params: TestSpecificFields): Result<string> =>
                succeed(params.word),
            formatter: (word: string): string => `The ${word} is the word`,
        }),
        general: new TestCommand<TestGeneralFields>({
            name: 'general',
            description: 'The general test command',
            examples: ['  Any phrase containing test', '  Test must be contained'],
            parser: builder.build('{{testPhrase}}').getValueOrThrow(),
            converter: Converters.object<TestGeneralFields>({
                testPhrase: Converters.string,
            }),
            executor: (params: TestGeneralFields): Result<string> =>
                succeed(params.testPhrase),
            formatter: (phrase: string): string => `The test phrase is ${phrase}`,
        }),
        broken: new TestCommand<TestBrokenFields>({
            name: 'broken',
            description: 'The broken test command',
            parser: builder.build('bad {{broken}}').getValueOrThrow(),
            converter: Converters.object<TestBrokenFields>({
                broken: Converters.string,
            }),
            executor: (params: TestBrokenFields): Result<string> =>
                succeed(params.broken),
            formatter: (word: string): string => `The bad word is ${word}`,
        }),
        execFails: new TestCommand<TestExecFailsFields>({
            name: 'execFails',
            description: 'Test command with exec failure',
            parser: builder.build('fail with {{word?}}').getValueOrThrow(),
            converter: Converters.object<TestExecFailsFields>(
                {
                    word: Converters.string,
                },
                ['word']
            ),
            executor: (params: TestExecFailsFields): Result<string> => {
                return fail(params.word);
            },
            formatter: (word: string): string => `should have failed but got ${word}`,
        }),
    };

    const commandTests = [
        {
            description: 'succeeds with no evaluation or display order specified',
            commands: testCommands,
            evalOrder: undefined,
            displayOrder: undefined,
        },
        {
            description: 'succeeds with an evaluation order that lists all keys',
            commands: testCommands,
            evalOrder: testOrder,
            displayOrder: undefined,
        },
        {
            description: 'sets display order independently of eval order',
            commands: testCommands,
            evalOrder: testOrder,
            displayOrder: Array.from(testOrder).reverse(),
        },
        {
            description: 'fails if evaluation order is missing any tests that are present',
            commands: testCommands,
            evalOrder: ['specific', 'general'] as (keyof TestCommands)[],
            displayOrder: undefined,
            error: /present in commands but not in evaluation order/i,
        },
        {
            description: 'fails if display order is missing any tests that are present',
            commands: testCommands,
            evalOrder: undefined,
            displayOrder: ['specific', 'general'] as (keyof TestCommands)[],
            error: /present in commands but not in display order/i,
        },
        {
            description: 'fails if evaluation order lists any keys that are missing',
            commands: {
                specific: testCommands.specific,
                general: testCommands.broken,
            },
            evalOrder: ['specific', 'general', 'broken'] as (keyof TestCommands)[],
            displayOrder: undefined,
            error: /present in evaluation order but not in commands/i,
        },
        {
            description: 'fails if display order lists any keys that are missing',
            commands: {
                specific: testCommands.specific,
                general: testCommands.broken,
            },
            evalOrder: undefined,
            displayOrder: ['specific', 'general', 'broken'] as (keyof TestCommands)[],
            error: /present in display order but not in commands/i,
        },
    ];

    describe('constructor', (): void => {
        commandTests.forEach((commandTest): void => {
            test(commandTest.description, (): void => {
                if (commandTest.error) {
                    expect(
                        () =>
                            new CommandProcessor<TestCommands>(
                                commandTest.commands,
                                commandTest.evalOrder,
                                commandTest.displayOrder
                            )
                    ).toThrowError(commandTest.error);
                }
                else {
                    const cmds = new CommandProcessor<TestCommands>(
                        commandTest.commands,
                        commandTest.evalOrder,
                        commandTest.displayOrder
                    );
                    expect(cmds).toBeDefined();
                    expect(cmds.numCommands).toBe(
                        Object.values(commandTest.commands).length
                    );
                    if ((commandTest.displayOrder ?? commandTest.evalOrder) !== undefined) {
                        expect(cmds.displayOrder).toBe(commandTest.displayOrder ?? commandTest.evalOrder);
                    }
                }
            });
        });
    });

    describe('getHelp method', () => {
        test('concatenates help for all commands', () => {
            const cmds = new CommandProcessor<TestCommands>(testCommands, testOrder);
            expect(cmds.getHelp()).toMatchInlineSnapshot(`
        Array [
          "The specific test command",
          "  This is a test",
          "  This is a sentence",
          "The general test command",
          "  Any phrase containing test",
          "  Test must be contained",
          "Test command with exec failure",
          "The broken test command",
        ]
      `);
        });

        test('concatenates help in display order', () => {
            const reversed = Array.from(testOrder).reverse();
            const cmds1 = new CommandProcessor<TestCommands>(
                testCommands,
                testOrder,
                testOrder
            );
            const cmds2 = new CommandProcessor<TestCommands>(
                testCommands,
                testOrder,
                reversed
            );

            const help1 = cmds1.getHelp();
            const help2 = cmds2.getHelp();

            expect(help2).not.toEqual(help1);
            expect(help2).toMatchInlineSnapshot(`
        Array [
          "The broken test command",
          "Test command with exec failure",
          "The general test command",
          "  Any phrase containing test",
          "  Test must be contained",
          "The specific test command",
          "  This is a test",
          "  This is a sentence",
        ]
      `);
        });
    });

    describe('validateAll', (): void => {
        const cmds = new CommandProcessor<TestCommands>(testCommands, testOrder);
        test('processes only matching commands', (): void => {
            expect(cmds.validateAll('A test, this is.')).toSucceedWith(
                expect.objectContaining({
                    keys: ['general'],
                    validated: {
                        general: expect.objectContaining({ command: 'general' }),
                    },
                    validationErrors: [],
                })
            );
        });

        test('processes all matching commands', (): void => {
            expect(cmds.validateAll('This is a test')).toSucceedWith(
                expect.objectContaining({
                    keys: ['specific', 'general'],
                    validated: {
                        general: expect.objectContaining({ command: 'general' }),
                        specific: expect.objectContaining({ command: 'specific' }),
                    },
                    validationErrors: [],
                })
            );
        });

        test('returns an empty result if no command matches', (): void => {
            expect(cmds.validateAll('An example')).toSucceedWith({
                keys: [],
                validated: {},
                validationErrors: [],
            });
        });

        test('fails if any of the commands fail', () => {
            expect(cmds.validateAll('bad data')).toFailWith(
                /mismatched capture count/i
            );
        });
    });

    describe('validateOne', (): void => {
        const cmds = new CommandProcessor(testCommands, testOrder);
        test('validates exactly one matching command', (): void => {
            expect(cmds.validateOne('A test, this is.')).toSucceedWith(
                expect.objectContaining({ command: 'general' }),
            );
        });

        test('fails if more than one command matches', (): void => {
            expect(cmds.validateOne('This is a test'))
                .toFailWith(/ambiguous command/i);
        });

        test('fails if no command matches', (): void => {
            expect(cmds.validateOne('An example'))
                .toFailWith(/no command matched/i);
        });

        test('propagates errors if commands fail during validation', () => {
            expect(cmds.validateOne('This is a disallowed'))
                .toFailWith(/disallowed is not allowed/i);
        });

        test('fails if any command fails', () => {
            expect(cmds.validateOne('bad data')).toFailWith(
                /mismatched capture count/i
            );
        });
    });

    describe('processAll', (): void => {
        const cmds = new CommandProcessor<TestCommands>(testCommands, testOrder);

        test('processes only matching commands', (): void => {
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

        test('processes all matching commands', (): void => {
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

        test('returns an empty result if no command matches', (): void => {
            expect(cmds.processAll('An example')).toSucceedWith({
                keys: [],
                executed: {},
            });
        });

        // Actually, this seems wrong. It should propagate execution errors
        test('silently ignores failing commands if any commands pass', () => {
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

        test('fails if no commands succeed but some fail execution', () => {
            expect(cmds.processAll('fail with error')).toFailWith(/error/i);
        });

        test('fails if any of the commands fail validation', () => {
            expect(cmds.processAll('bad data')).toFailWith(
                /mismatched capture count/i
            );
        });
    });

    describe('processFirst', (): void => {
        const cmds = new CommandProcessor(testCommands, testOrder);
        test('processes only the first matching command', (): void => {
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

        test('fails if no command matches', (): void => {
            expect(cmds.processFirst('An example')).toFailWith(/no command matched/i);
        });

        test('fails if the first matching command fails validation', () => {
            expect(cmds.processFirst('bad data')).toFailWith(
                /mismatched capture count/i
            );
        });

        // Actually, this seems wrong. It should propagate execution errors
        test('silently ignores failing commands if any commands pass', () => {
            const cmds2 = new CommandProcessor(testCommands, ['execFails', 'specific', 'general', 'broken']);

            expect(cmds2.processFirst('fail with test')).toSucceedWith({
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
        test('processes exactly one matching command', (): void => {
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

        test('fails if more than one command matches', (): void => {
            expect(cmds.processOne('This is a test'))
                .toFailWith(/ambiguous command/i);
        });

        test('fails if no command matches', (): void => {
            expect(cmds.processOne('An example'))
                .toFailWith(/no command matched/i);
        });

        test('propagates errors if commands fail during validation', () => {
            expect(cmds.processOne('This is a disallowed'))
                .toFailWith(/disallowed is not allowed/i);
        });

        test('fails if any command fails', () => {
            expect(cmds.processOne('bad data')).toFailWith(
                /mismatched capture count/i
            );
        });

        test('propagates execution errors from a single matching comand', () => {
            expect(cmds.processOne('fail with ERROR')).toFailWith('ERROR');
        });
    });

    describe('preProcessOne', (): void => {
        const cmds = new CommandProcessor(testCommands, testOrder);
        const formatters = cmds.getDefaultFormatters('text').getValueOrThrow();

        test('pre-processes exactly one matching command', (): void => {
            const partial = { general: formatters.specific };
            expect(cmds.preProcessOne('A test, this is.', partial)).toSucceedAndSatisfy((pp: PreProcessedCommand) => {
                expect(pp.execute()).toSucceedWith('The test phrase is A test, this is.');
            });
        });

        test('fails if the necessary formatter is undefined', () => {
            const partial = { specific: formatters.specific };
            expect(cmds.preProcessOne('A test, this is.', partial)).toFailWith(/no formatter supplied/i);
        });

        test('fails if more than one command matches', (): void => {
            expect(cmds.preProcessOne('This is a test', formatters))
                .toFailWith(/ambiguous command/i);
        });

        test('fails if no command matches', (): void => {
            expect(cmds.preProcessOne('An example', formatters))
                .toFailWith(/no command matched/i);
        });

        test('propagates errors if commands fail during validation', () => {
            expect(cmds.preProcessOne('This is a disallowed', formatters))
                .toFailWith(/disallowed is not allowed/i);
        });

        test('fails if any command fails', () => {
            expect(cmds.preProcessOne('bad data', formatters)).toFailWith(
                /mismatched capture count/i
            );
        });

        test('propagates execution errors from a single matching comand', () => {
            expect(cmds.preProcessOne('fail with ERROR', formatters)).toSucceedAndSatisfy((pp: PreProcessedCommand) => {
                expect(pp.execute()).toFailWith('ERROR');
            });
        });
    });

    describe('formatAll method', () => {
        const cmds = new CommandProcessor<TestCommands>(testCommands, testOrder);
        const executed = cmds.processAll('This is a test').getValueOrThrow();
        const formatters = cmds.getDefaultFormatters('text').getValueOrThrow();

        test('formats all results', () => {
            expect(cmds.formatAll(executed, formatters)).toSucceedWith({
                formatted: {
                    general: 'The test phrase is This is a test',
                    specific: 'The test is the word',
                },
                keys: ['specific', 'general'],
            });
        });
    });

    describe('format method', () => {
        const cmds = new CommandProcessor<TestCommands>(testCommands, testOrder);
        const executed = cmds.processAll('This is a test').getValueOrThrow();
        const formatters = cmds.getDefaultFormatters('text').getValueOrThrow();
        const partialFormatters = { specific: formatters.specific };

        test('formats a succesful result', () => {
            expect(cmds.format('general', executed, formatters)).toSucceedWith(
                'The test phrase is This is a test'
            );
        });

        test('fails if no result is found', () => {
            expect(cmds.format('broken', executed, formatters)).toFailWith(
                /no result for broken/i
            );
        });

        test('fails if no formatter is present', () => {
            expect(cmds.format('general', executed, partialFormatters)).toFailWith(
                /no formatter for general/i
            );
        });
    });

    describe('getDefaultFormatters method', () => {
        const cmds = new CommandProcessor<TestCommands>(testCommands, testOrder);
        test('gets formatters for all fields by default', () => {
            expect(cmds.getDefaultFormatters('text'))
                .toSucceedAndSatisfy((got: Partial<ResultFormatters<TestCommands>>) => {
                    for (const key of cmds.displayOrder) {
                        expect(got[key]).toBeDefined();
                    }
                });
        });

        test('gets formatters only for specified fields if present', () => {
            const wantKeys: (keyof TestCommands)[] = ['specific', 'general'];
            expect(cmds.getDefaultFormatters('text', wantKeys))
                .toSucceedAndSatisfy((got: Partial<ResultFormatters<TestCommands>>) => {
                    for (const key of cmds.displayOrder) {
                        if (wantKeys.includes(key)) {
                            expect(got[key]).toBeDefined();
                        }
                        else {
                            expect(got[key]).toBeUndefined();
                        }
                    }
                });
        });
    });
});
