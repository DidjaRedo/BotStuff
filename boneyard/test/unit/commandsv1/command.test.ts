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
import * as TimeConverters from '../../../src/time/timeConverters';

import {
    CommandBase,
    CommandInitializer,
    PreProcessedCommandBase,
    ValidatedCommand,
    ValidatedCommandBase,
} from '../../../src/commandsv1';
import { CommandProperties, ParserBuilder } from '../../../src/commands/commandParser';
import {
    FormatTargets,
    FormattableBase,
    Formatter,
    Result,
    fail,
    succeed,
} from '@fgv/ts-utils';

import moment from 'moment';

describe('Command module', () => {
    interface TestFields {
        word: string;
        words: string;
        testPhrase: string;
        time: Date;
        broken: string;
    }
    type ParsedTestFields = Record<keyof TestFields, string|number|Date>;

    const fields: CommandProperties<TestFields> = {
        word: { value: '\\w+' },
        words: { value: '\\w+(?:\\s|\\w|\\d|`|\'|-|\\.)*' },
        testPhrase: { value: '.*test.*' },
        time: { value:  '(?:\\d?\\d):?(?:\\d\\d)\\s*(?:a|A|am|AM|p|P|pm|PM)?', optional: false },
        broken: { value: '(\\w)(\\w)(\\w)(\\w)' },
    };
    const builder = new ParserBuilder(fields);

    type TestCommandType = 'specific'|'date'|'broken';

    class TestCommand<TF, TR> extends CommandBase<TestCommandType, ParsedTestFields, TF, TR> {
        protected _defaultFormatter?: Formatter<TR>;
        public constructor(
            init: CommandInitializer<TestCommandType, ParsedTestFields, TF, TR>,
            defaultFormatter?: Formatter<TR>
        ) {
            super(init);
            this._defaultFormatter = defaultFormatter;
        }

        public getDefaultFormatter(_target: FormatTargets): Result<Formatter<TR>> {
            return (this._defaultFormatter
                ? succeed(this._defaultFormatter)
                : fail('No default formatter'));
        }
    }

    function stringFormatter(format: string, _value: string): Result<string> {
        return succeed(format);
    }

    type TestSpecificFields = Required<Pick<TestFields, 'word'>>;
    type TestSpecificInitializer = CommandInitializer<TestCommandType, ParsedTestFields, TestSpecificFields, string>;
    const specificParser = builder.build('This is a {{word}}').getValueOrThrow();
    const specificConverter = Converters.object<TestSpecificFields>({
        word: Converters.string,
    });
    const specificCommand = new TestCommand<TestSpecificFields, string>(
        {
            name: 'specific',
            description: 'The specific test command',
            examples: ['specific example goes here', 'second line goes here'],
            parser: specificParser,
            converter: specificConverter,
            executor: (params: TestSpecificFields): Result<string> => {
                return succeed(params.word);
            },
            formatter: (word: string): string => {
                return `I got ${word}`;
            },
        },
        stringFormatter,
    );

    type TestDateFields = Required<Pick<TestFields, 'time'>>&Partial<Pick<TestFields, 'words'>>;
    type TestDateInitializer = CommandInitializer<TestCommandType, ParsedTestFields, TestDateFields, TestDateFields>;
    const dateParser = builder.build('{{time}} {{words?}}').getValueOrThrow();
    const dateConverter = Converters.object<TestDateFields>({
        time: TimeConverters.flexTime,
        words: Converters.string,
    }, ['words']);
    class DateFormatter extends FormattableBase {
        private _date: TestDateFields;
        public constructor(date: TestDateFields) {
            super();
            this._date = date;
        }
        public get time(): string { return moment(this._date.time).format('HH:mm'); }
        public get words(): string|undefined { return this._date.words; }
    }
    function formatDate(format: string, date: TestDateFields): Result<string> {
        return new DateFormatter(date).format(format);
    }
    const dateCommand = new TestCommand<TestDateFields, TestDateFields>(
        {
            name: 'date',
            description: 'The date test command',
            parser: dateParser,
            converter: dateConverter,
            executor: (params: TestDateFields): Result<TestDateFields> => {
                if (params.words?.includes('fail')) {
                    return fail('Command asked to fail');
                }
                return succeed(params);
            },
            formatter: (got: TestDateFields): string => {
                return (got.words)
                    ? 'Got {{time}} with {{words}}'
                    : 'Got {{time}}';
            },
        },
        formatDate
    );

    describe('CommandBase class', (): void => {
        describe('constructor', () => {
            test('initializes correctly', () => {
                expect(specificCommand.name).toBe('specific');
                expect(specificCommand.getDescription()).toBe('The specific test command');
                expect(specificCommand.getExamples()).toBe('specific example goes here\nsecond line goes here');
                expect(dateCommand.getExamples()).toBeUndefined();
            });
        });

        describe('getHelpLines method', () => {
            test('joins description and examples when examples exist', () => {
                expect(specificCommand.getHelpLines()).toEqual([
                    'The specific test command',
                    'specific example goes here',
                    'second line goes here',
                ]);
            });

            test('returns description when no examples exist', () => {
                expect(dateCommand.getHelpLines()).toEqual([
                    'The date test command',
                ]);
            });
        });

        describe('validate method', () => {
            test('validates a valid command', () => {
                [
                    { cmd: specificCommand, src: 'This is a test', payload: 'test', message: 'I got test' },
                ].forEach((test) => {
                    expect(test.cmd.validate(test.src)).toSucceedAndSatisfy((vc: ValidatedCommand<TestCommandType, string>) => {
                        expect(vc.execute()).toSucceedWith(expect.objectContaining({
                            command: 'specific',
                            result: test.payload,
                            message: test.message,
                        }));
                    });
                });
            });

            test('returns undefined for a command that does not match the pattern', () => {
                expect(specificCommand.validate('This is not a test')).toSucceedWith(undefined);
            });

            test('reports an error for a command that matches the pattern but fails conversion', () => {
                expect(dateCommand.validate('33:22PM words')).toFailWith(/invalid time/i);
            });

            test('Does not report an error for a validated command that will fail at execution', () => {
                expect(dateCommand.validate('10:15 fail')).toSucceedAndSatisfy((vc: ValidatedCommand<TestCommandType, TestDateFields>) => {
                    expect(vc.execute()).toFailWith(/asked to fail/i);
                });
            });
        });

        describe('execute method', () => {
            test('executes a valid command', () => {
                expect(specificCommand.execute('This is a test')).toSucceedWith({
                    command: 'specific',
                    result: 'test',
                    message: 'I got test',
                });

                expect(dateCommand.execute('23:59 some words here')).toSucceedWith({
                    command: 'date',
                    result: expect.objectContaining({
                        time: expect.any(Date),
                        words: 'some words here',
                    }),
                    message: expect.stringMatching('Got {{time}} with {{words}}'),
                });

                expect(dateCommand.execute('22:15')).toSucceedWith({
                    command: 'date',
                    result: expect.objectContaining({
                        time: expect.any(Date),
                    }),
                    message: expect.stringMatching('Got {{time}}'),
                });
            });

            test('returns undefined for a command that does not match the pattern', () => {
                expect(specificCommand.execute('This is not a test')).toSucceedWith(undefined);
            });

            test('reports an error for a command that matches the pattern but fails conversion', () => {
                expect(dateCommand.execute('33:22PM words')).toFailWith(/invalid time/i);
            });

            test('reports an error for a validated command that will fail at execution', () => {
                expect(dateCommand.execute('10:15 fail')).toFailWith(/asked to fail/i);
            });
        });

        describe('format method', () => {
            test('formats a valid result', () => {
                const executed = dateCommand.execute('23:59 some words here').getValueOrThrow();
                expect(executed).toBeDefined();
                if (executed !== undefined) {
                    expect(dateCommand.format(executed, formatDate))
                        .toSucceedWith(/23:59.*with some words here/i);
                }
            });

            test('fails if the command result or message or value is undefined', () => {
                expect(dateCommand.format({
                    command: 'date',
                    result: { time: new Date(), words: 'whatever' },
                    message: undefined as unknown as string,
                }, formatDate)).toFailWith(/cannot format/i);

                expect(dateCommand.format({
                    command: 'date',
                    result: undefined as unknown as TestDateFields,
                    message: 'howdy',
                }, formatDate)).toFailWith(/cannot format/i);
            });
        });
    });

    describe('PreProcessedCommandBase', () => {
        describe('create static method', () => {
            test('fails if command is undefined', () => {
                // const validated = specificCommand.validate('This is a test').getValueOrThrow();
                const validated: ValidatedCommandBase<TestCommandType, string>|undefined = undefined;
                const formatter = (s: string) => succeed(s);
                expect(PreProcessedCommandBase.create(validated, formatter)).toFailWith(/undefined validated command/i);
            });

            test('fails if formatter', () => {
                const validated = specificCommand.validate('This is a test').getValueOrThrow();
                const formatter = undefined;
                expect(PreProcessedCommandBase.create(validated, formatter)).toFailWith(/no formatter/i);
            });
        });
    });
});
