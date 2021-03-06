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
    CommandProcessor,
    CommandProperties,
    CommandsByName,
    GenericCommand,
    GenericCommandInitializer,
    ParserBuilder,
    ResultFormattersByName,
} from '../../../src/commands';
import { FormatTargets, Formatter, Result, fail, succeed } from '@fgv/ts-utils';

describe('CommandProcessor class', (): void => {
    interface TestTokens {
        word: string;
        words: string;
        testPhrase: string;
        time: string;
        broken: string;
    }
    type ParsedTestTokens = Record<keyof TestTokens, string | number | Date>;

    const tokens: CommandProperties<TestTokens> = {
        word: { value: '\\w+' },
        words: { value: "\\w+(?:\\s|\\w|\\d|`|'|-|\\.)*" },
        testPhrase: { value: '.*test.*' },
        time: {
            value: '(?:\\d?\\d):?(?:\\d\\d)\\s*(?:a|A|am|AM|p|P|pm|PM)?)',
            optional: false,
        },
        broken: { value: '(\\w)(\\w)(\\w)(\\w)' },
    };
    const builder = new ParserBuilder(tokens);

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

    type TestSpecificParams = Required<Pick<TestTokens, 'word'>>;
    type TestGeneralParams = Required<Pick<TestTokens, 'testPhrase'>>;
    type TestBrokenParams = Required<Pick<TestTokens, 'broken'>>;
    type TestExecFailsParams = Required<Pick<TestTokens, 'word'>>;

    type TestContext = string|undefined;
    type TestResult = string|undefined;

    class TestCommand<TP> extends GenericCommand<
        keyof TestCommands,
        ParsedTestTokens,
        TestContext,
        TP,
        TestResult
        > {
        public constructor(
            init: GenericCommandInitializer<keyof TestCommands, ParsedTestTokens, TestContext, TP, TestResult>
        ) {
            super(init);
        }
    }

    function testStringFormatter(format: string, value?: TestResult): Result<string> {
        return succeed(format.replace('{{result}}', value ?? ''));
    }

    function getDefaultTestFormatter(_target: FormatTargets): Result<Formatter<TestResult>> {
        return succeed(testStringFormatter);
    }

    const testCommands: CommandsByName<TestCommands, TestResult> = {
        specific: new TestCommand<TestSpecificParams>({
            name: 'specific',
            repeatable: true,
            description: ['The specific test command'],
            examples: ['  This is a test', '  This is a sentence'],
            parser: builder.build('This is a {{word}}').getValueOrThrow(),
            getConverter: () => Converters.object<TestSpecificParams>({
                word: Converters.string.withConstraint((v: string): Result<string> => {
                    if (v === 'disallowed') {
                        return fail('disallowed is not allowed');
                    }
                    return succeed(v);
                }),
            }),
            execute: (params: TestSpecificParams, _context: TestContext): Result<string> => {
                return succeed(params.word);
            },
            format: 'The {{result}} is the word',
            getDefaultFormatter: getDefaultTestFormatter,
        }),
        general: new TestCommand<TestGeneralParams>({
            name: 'general',
            repeatable: true,
            description: ['The general test command'],
            examples: ['  Any phrase containing test', '  Test must be contained'],
            parser: builder.build('{{testPhrase}}').getValueOrThrow(),
            getConverter: () => Converters.object<TestGeneralParams>({
                testPhrase: Converters.string,
            }),
            execute: (params: TestGeneralParams, _context: TestContext): Result<string> => {
                return succeed(params.testPhrase);
            },
            format: 'The test phrase is {{result}}',
            getDefaultFormatter: getDefaultTestFormatter,
        }),
        broken: new TestCommand<TestBrokenParams>({
            name: 'broken',
            repeatable: false,
            description: ['The broken test command'],
            parser: builder.build('bad {{broken}}').getValueOrThrow(),
            getConverter: () => Converters.object<TestBrokenParams>({
                broken: Converters.string,
            }),
            execute: (params: TestBrokenParams, _context: TestContext): Result<string> => {
                return succeed(params.broken);
            },
            format: '{{result}} is broken',
            getDefaultFormatter: getDefaultTestFormatter,
        }),
        execFails: new TestCommand<TestExecFailsParams>({
            name: 'execFails',
            repeatable: false,
            description: ['Test command with exec failure'],
            parser: builder.build('fail with {{word?}}').getValueOrThrow(),
            getConverter: () => Converters.object<TestExecFailsParams>(
                {
                    word: Converters.string,
                },
                ['word']
            ),
            execute: (params: TestExecFailsParams, _context: TestContext): Result<string> => {
                return fail(params.word);
            },
            format: '{{result}} should fail exec',
            getDefaultFormatter: getDefaultTestFormatter,
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
                            new CommandProcessor<TestCommands, TestContext>(
                                commandTest.commands,
                                commandTest.evalOrder,
                                commandTest.displayOrder
                            )
                    ).toThrowError(commandTest.error);
                }
                else {
                    const cmds = new CommandProcessor<TestCommands, TestContext>(
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
            const cmds = new CommandProcessor<TestCommands, TestContext>(testCommands, testOrder);
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
            const cmds1 = new CommandProcessor<TestCommands, TestContext>(
                testCommands,
                testOrder,
                testOrder
            );
            const cmds2 = new CommandProcessor<TestCommands, TestContext>(
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

    describe('preprocessAll method', (): void => {
        const cmds = new CommandProcessor<TestCommands, TestContext>(testCommands, testOrder);
        const context: TestContext = 'test';

        test('preprocesses only matching commands', (): void => {
            expect(cmds.preprocessAll('A test, this is.', context)).toSucceedWith(
                expect.objectContaining({
                    keys: ['general'],
                    preprocessed: {
                        general: expect.objectContaining({ name: 'general' }),
                    },
                    preprocessErrors: [],
                })
            );
        });

        test('preprocesses all matching commands', (): void => {
            expect(cmds.preprocessAll('This is a test', context)).toSucceedWith(
                expect.objectContaining({
                    keys: ['specific', 'general'],
                    preprocessed: {
                        general: expect.objectContaining({ name: 'general' }),
                        specific: expect.objectContaining({ name: 'specific' }),
                    },
                    preprocessErrors: [],
                })
            );
        });

        test('returns an empty result if no command matches', (): void => {
            expect(cmds.preprocessAll('An example', context)).toSucceedWith({
                keys: [],
                preprocessed: {},
                preprocessErrors: [],
            });
        });

        test('fails if any of the command preprocessors fail', () => {
            expect(cmds.preprocessAll('bad data', context)).toFailWith(
                /mismatched capture count/i
            );
        });
    });

    describe('preprocessOne method', (): void => {
        const cmds = new CommandProcessor(testCommands, testOrder);
        const context: TestContext = 'test';

        test('preprocesses exactly one matching command', (): void => {
            expect(cmds.preprocessOne('A test, this is.', context)).toSucceedWith(
                expect.objectContaining({ name: 'general' }),
            );
        });

        test('fails if more than one command matches', (): void => {
            expect(cmds.preprocessOne('This is a test', context))
                .toFailWith(/ambiguous command/i);
        });

        test('fails if no command matches', (): void => {
            expect(cmds.preprocessOne('An example', context))
                .toFailWith(/no command matched/i);
        });

        test('propagates errors if preprocessors fail during validation', () => {
            expect(cmds.preprocessOne('This is a disallowed', context))
                .toFailWith(/disallowed is not allowed/i);
        });

        test('fails if any preprocessor fails during parse', () => {
            expect(cmds.preprocessOne('bad data', context)).toFailWith(
                /mismatched capture count/i
            );
        });
    });

    describe('executeAll method', (): void => {
        const cmds = new CommandProcessor<TestCommands, TestContext>(testCommands, testOrder);
        const context: TestContext = 'test';

        test('executes only matching commands', (): void => {
            expect(cmds.executeAll('A test, this is.', context)).toSucceedWith({
                keys: ['general'],
                executed: {
                    general: {
                        command: 'general',
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        _value: 'A test, this is.',
                        format: 'The test phrase is {{result}}',
                    },
                },
                executionErrors: [],
            });
        });

        test('executes all matching commands', (): void => {
            expect(cmds.executeAll('This is a test', context)).toSucceedWith({
                keys: ['specific', 'general'],
                executed: {
                    general: {
                        command: 'general',
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        _value: 'This is a test',
                        format: 'The test phrase is {{result}}',
                    },
                    specific: {
                        command: 'specific',
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        _value: 'test',
                        format: 'The {{result}} is the word',
                    },
                },
                executionErrors: [],
            });
        });

        test('returns an empty result if no command matches', (): void => {
            expect(cmds.executeAll('An example', context)).toSucceedWith({
                keys: [],
                executed: {},
                executionErrors: [],
            });
        });

        // Actually, this seems wrong. It should propagate execution errors
        test('silently ignores failing commands if any commands pass', () => {
            expect(cmds.executeAll('fail with test', context)).toSucceedWith({
                keys: ['general'],
                executed: {
                    general: {
                        command: 'general',
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        _value: 'fail with test',
                        format: 'The test phrase is {{result}}',
                    },
                },
                executionErrors: ['execFails: test'],
            });
        });

        test('fails if no commands succeed but some fail execution', () => {
            expect(cmds.executeAll('fail with error', context)).toFailWith(/error/i);
        });

        test('fails if any of the commands fail validation', () => {
            expect(cmds.executeAll('bad data', context)).toFailWith(
                /mismatched capture count/i
            );
        });
    });

    describe('executeFirst method', (): void => {
        const cmds = new CommandProcessor(testCommands, testOrder);
        const context: TestContext = 'test';

        test('executes only the first matching command', (): void => {
            expect(cmds.executeFirst('A test, this is.', context)).toSucceedWith({
                keys: ['general'],
                executed: {
                    general: {
                        command: 'general',
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        _value: 'A test, this is.',
                        format: 'The test phrase is {{result}}',
                    },
                },
                executionErrors: [],
            });
            expect(cmds.executeFirst('This is a test', context)).toSucceedWith({
                keys: ['specific'],
                executed: {
                    specific: {
                        command: 'specific',
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        _value: 'test',
                        format: 'The {{result}} is the word',
                    },
                },
                executionErrors: [],
            });
        });

        test('fails if no command matches', (): void => {
            expect(cmds.executeFirst('An example', context)).toFailWith(/no command matched/i);
        });

        test('fails if the first matching command fails validation', () => {
            expect(cmds.executeFirst('bad data', context)).toFailWith(
                /mismatched capture count/i
            );
        });

        test('silently ignores failing commands if any commands pass', () => {
            const cmds2 = new CommandProcessor(testCommands, ['execFails', 'specific', 'general', 'broken']);

            expect(cmds2.executeFirst('fail with test', context)).toSucceedWith({
                keys: ['general'],
                executed: {
                    general: {
                        command: 'general',
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        _value: 'fail with test',
                        format: 'The test phrase is {{result}}',
                    },
                },
                executionErrors: ['execFails: test'],
            });
        });
    });

    describe('executeOne method', (): void => {
        const cmds = new CommandProcessor(testCommands, testOrder);
        const context: TestContext = 'test';

        test('executes exactly one matching command', (): void => {
            expect(cmds.executeOne('A test, this is.', context)).toSucceedWith({
                keys: ['general'],
                executed: {
                    general: {
                        command: 'general',
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        _value: 'A test, this is.',
                        format: 'The test phrase is {{result}}',
                    },
                },
                executionErrors: [],
            });
        });

        test('fails if more than one command matches', (): void => {
            expect(cmds.executeOne('This is a test', context))
                .toFailWith(/ambiguous command/i);
        });

        test('fails if no command matches', (): void => {
            expect(cmds.executeOne('An example', context))
                .toFailWith(/no command matched/i);
        });

        test('propagates errors if commands fail during validation', () => {
            expect(cmds.executeOne('This is a disallowed', context))
                .toFailWith(/disallowed is not allowed/i);
        });

        test('fails if any command fails', () => {
            expect(cmds.executeOne('bad data', context)).toFailWith(
                /mismatched capture count/i
            );
        });

        test('propagates execution errors from a single matching comand', () => {
            expect(cmds.executeOne('fail with ERROR', context)).toFailWith('ERROR');
        });
    });

    describe('formatAll method', () => {
        const cmds = new CommandProcessor<TestCommands, TestContext>(testCommands, testOrder);
        const context: TestContext = 'test';
        const executed = cmds.executeAll('This is a test', context).getValueOrThrow();
        const formatters = cmds.getDefaultFormatters('text').getValueOrThrow();

        test('formats all results', () => {
            expect(cmds.formatAll(executed, formatters)).toSucceedWith({
                formatted: {
                    general: 'The test phrase is This is a test',
                    specific: 'The test is the word',
                },
                keys: ['specific', 'general'],
                formatErrors: [],
            });
        });

        test('reports missing formatters', () => {
            const badFormatters = { ...formatters, general: undefined };

            expect(cmds.formatAll(executed, badFormatters)).toSucceedWith({
                formatted: {
                    specific: 'The test is the word',
                },
                keys: ['specific'],
                formatErrors: [
                    expect.stringMatching(/results but no formatter/i),
                ],
            });
        });

        test('reports errors from formatters', () => {
            const badFormatters = {
                ...formatters,
                general: (): Result<string> => fail('formatter oops'),
            };

            expect(cmds.formatAll(executed, badFormatters)).toSucceedWith({
                formatted: {
                    specific: 'The test is the word',
                },
                keys: ['specific'],
                formatErrors: [
                    expect.stringMatching(/formatter oops/i),
                ],
            });
        });
    });

    describe('format method', () => {
        const cmds = new CommandProcessor<TestCommands, TestContext>(testCommands, testOrder);
        const context: TestContext = 'test';
        const executed = cmds.executeAll('This is a test', context).getValueOrThrow();
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
        const cmds = new CommandProcessor<TestCommands, TestContext>(testCommands, testOrder);
        test('gets formatters for all fields by default', () => {
            expect(cmds.getDefaultFormatters('text'))
                .toSucceedAndSatisfy((got: Partial<ResultFormattersByName<TestCommands>>) => {
                    for (const key of cmds.displayOrder) {
                        expect(got[key]).toBeDefined();
                    }
                });
        });

        test('gets formatters only for specified fields if present', () => {
            const wantKeys: (keyof TestCommands)[] = ['specific', 'general'];
            expect(cmds.getDefaultFormatters('text', wantKeys))
                .toSucceedAndSatisfy((got: Partial<ResultFormattersByName<TestCommands>>) => {
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
