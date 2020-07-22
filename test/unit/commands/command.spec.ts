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
import * as TimeConverters from '../../../src/time/timeConverters';

import { CommandBase, CommandInitializer, ValidatedCommand } from '../../../src/commands/command';
import { CommandProperties, ParserBuilder } from '../../../src/commands/commandParser';
import { FormatTargets, Formatter } from '../../../src/utils/formatter';
import { Result, fail, succeed } from '../../../src/utils/result';

import moment from 'moment';

describe('CommandBase class', (): void => {
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
        public constructor(init: CommandInitializer<TestCommandType, ParsedTestFields, TF, TR>) {
            super(init);
        }

        public getDefaultFormatter(_target: FormatTargets): Result<Formatter<TR>> {
            return fail('No default formatter');
        }
    }

    type TestSpecificFields = Required<Pick<TestFields, 'word'>>;
    type TestSpecificInitializer = CommandInitializer<TestCommandType, ParsedTestFields, TestSpecificFields, string>;
    const specificParser = builder.build('This is a {{word}}').getValueOrThrow();
    const specificConverter = Converters.object<TestSpecificFields>({
        word: Converters.string,
    });
    const specificCommand = new TestCommand<TestSpecificFields, string>({
        name: 'specific',
        description: 'The specific test command',
        examples: ['specific example goes here'],
        parser: specificParser,
        converter: specificConverter,
        executor: (params: TestSpecificFields): Result<string> => {
            return succeed(params.word);
        },
        formatter: (word: string): string => {
            return `I got ${word}`;
        },
    });

    type TestDateFields = Required<Pick<TestFields, 'time'>>&Partial<Pick<TestFields, 'words'>>;
    type TestDateInitializer = CommandInitializer<TestCommandType, ParsedTestFields, TestDateFields, TestDateFields>;
    const dateParser = builder.build('{{time}} {{words?}}').getValueOrThrow();
    const dateConverter = Converters.object<TestDateFields>({
        time: TimeConverters.flexTime,
        words: Converters.string,
    }, ['words']);
    const dateCommand = new TestCommand<TestDateFields, TestDateFields>({
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
            const time = moment(got.time).format('HH:mm');
            const words = got.words ? `"${got.words}"` : 'no words';
            return `Got ${time} with ${words}`;
        },
    });

    describe('constructor', () => {
        it('should correctly initialize', () => {
            expect(specificCommand.name).toBe('specific');
            expect(specificCommand.getDescription()).toBe('The specific test command');
            expect(specificCommand.getExamples()).toBe('specific example goes here');
            expect(dateCommand.getExamples()).toBeUndefined();
        });
    });

    describe('validate method', () => {
        it('should validate a valid command', () => {
            [
                { cmd: specificCommand, src: 'This is a test', payload: 'test', message: 'I got test' },
            ].forEach((test) => {
                expect(test.cmd.validate(test.src)).toSucceedWithCallback((vc: ValidatedCommand<TestCommandType, string>) => {
                    expect(vc.execute()).toSucceedWith(expect.objectContaining({
                        command: 'specific',
                        result: test.payload,
                        message: test.message,
                    }));
                });
            });
        });

        it('should return undefined for a command that does not match the pattern', () => {
            expect(specificCommand.validate('This is not a test')).toSucceedWith(undefined);
        });

        it('should report an error for a command that matches the pattern but fails conversion', () => {
            expect(dateCommand.validate('33:22PM words')).toFailWith(/invalid time/i);
        });

        it('should not report an error for a validated command that will fail at execution', () => {
            expect(dateCommand.validate('10:15 fail')).toSucceedWithCallback((vc: ValidatedCommand<TestCommandType, TestDateFields>) => {
                expect(vc.execute()).toFailWith(/asked to fail/i);
            });
        });
    });

    describe('execute method', () => {
        it('should execute a valid command', () => {
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
                message: expect.stringMatching(/23:59.*with "some words here"/i),
            });

            expect(dateCommand.execute('22:15')).toSucceedWith({
                command: 'date',
                result: expect.objectContaining({
                    time: expect.any(Date),
                }),
                message: expect.stringMatching(/22:15.*no words/i),
            });
        });

        it('should return undefined for a command that does not match the pattern', () => {
            expect(specificCommand.execute('This is not a test')).toSucceedWith(undefined);
        });

        it('should report an error for a command that matches the pattern but fails conversion', () => {
            expect(dateCommand.execute('33:22PM words')).toFailWith(/invalid time/i);
        });

        it('should not report an error for a validated command that will fail at execution', () => {
            expect(dateCommand.execute('10:15 fail')).toFailWith(/asked to fail/i);
        });
    });
});
