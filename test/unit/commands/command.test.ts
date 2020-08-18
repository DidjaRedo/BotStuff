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
import { Converters, Formatter, Result, fail, succeed } from '@fgv/ts-utils';

import { GenericCommand, GenericCommandInitializer, ParserBuilder } from '../../../src/commands';

type Tokens = { word: string, number: number, bool: string, broken: string };
const tokens = {
    word: { value: '\\w+' },
    number: { value: '\\d+' },
    bool: { value: '\\w+' },
    broken: { value: '(\\w+)\\s+(\\w+)' },
};
const builder = new ParserBuilder(tokens);

type Params = { word: string, number: number, bool: boolean, broken: string };

const wordParser = builder.build('{{word}}').getValueOrThrow();
const numberParser = builder.build('{{number}}').getValueOrThrow();
const boolParser = builder.build('{{bool}}').getValueOrThrow();
const brokenParser = builder.build('{{broken}}').getValueOrThrow();

const paramsConverter = Converters.object<Params>({
    word: Converters.string,
    number: Converters.number,
    bool: Converters.boolean,
    broken: Converters.string,
}, ['word', 'number', 'bool', 'broken']);

const fakeExec = (p: Params, c:string):Result<string> => {
    if (p.word === 'fail') {
        return fail('I was told to fail');
    }
    return succeed(`${p.word}+${c}`);
};

type CommandNames = 'test';
const baseInit: GenericCommandInitializer<CommandNames, Tokens, string, Params, string> = {
    name: 'test',
    repeatable: true,
    description: ['A test command'],
    examples: ['An example', '  on two lines'],
    footer: ['A footer'],
    parser: wordParser,
    getConverter: () => paramsConverter,
    execute: fakeExec,
    format: '{{text}}',
};

// testing base classes vie GenericCommand
describe('GenericCommand class', () => {
    describe('descriptive properties', () => {
        test('propagate from the initializer', () => {
            const cmd = GenericCommand.create(baseInit).getValueOrThrow();
            expect(cmd.name).toEqual(baseInit.name);
            expect(cmd.help.getDescription()).toEqual(baseInit.description);
            expect(cmd.help.getExamples()).toEqual(baseInit.examples);
            expect(cmd.help.getFooter()).toEqual(baseInit.footer);
            expect(cmd.help.getHelpText()).toEqual([
                ...baseInit.description,
                ...baseInit.examples ?? [],
                ...baseInit.footer ?? [],
            ]);
        });

        test('default to an empty array', () => {
            const init = {
                name: 'test',
                repeatable: true,
                description: ['description is required'],
                parser: wordParser,
                getConverter: () => paramsConverter,
                execute: fakeExec,
                format: 'format',
            };
            const cmd = GenericCommand.create(init).getValueOrThrow();
            expect(cmd.name).toEqual(init.name);
            expect(cmd.help.getDescription()).toEqual(init.description);
            expect(cmd.help.getExamples()).toEqual([]);
            expect(cmd.help.getFooter()).toEqual([]);
            expect(cmd.help.getHelpText()).toEqual(init.description);
        });
    });

    describe('execute method', () => {
        test('invokes the supplied execute method', () => {
            const execute = jest.fn(fakeExec);
            const init = { ...baseInit, execute };

            const cmd = new GenericCommand(init);
            expect(execute).not.toHaveBeenCalled();
            expect(cmd.execute('hello', 'context')).toSucceedWith('hello+context');
        });

        test('fails with detail match if string does not match', () => {
            const execute = jest.fn(() => succeed('okay'));
            const init = { ...baseInit, parser: numberParser, execute };

            const cmd = GenericCommand.create(init).getValueOrThrow();
            expect(cmd.execute('not a number', 'context')).toFailWithDetail(
                /no match/i,
                'parse',
            );
        });

        test('fails with detail internal if parser encounters an error', () => {
            const init = { ...baseInit, parser: brokenParser };

            const cmd = GenericCommand.create(init).getValueOrThrow();
            expect(cmd.execute('not working', 'context')).toFailWithDetail(
                /mismatched/i,
                'internal',
            );
        });

        test('fails with detail internal if creating converter fails', () => {
            const getConverter = () => { throw new Error('oops'); };
            const init = { ...baseInit, getConverter };

            const cmd = GenericCommand.create(init).getValueOrThrow();
            expect(cmd.preprocess('boom', 'context')).toFailWithDetail(
                /oops/i,
                'internal',
            );
        });

        test('fails with detail validate if conversion fails', () => {
            const init = { ...baseInit, parser: boolParser };

            const cmd = GenericCommand.create(init).getValueOrThrow();
            expect(cmd.execute('boom', 'context')).toFailWithDetail(
                /not a boolean/i,
                'validate',
            );
        });

        test('fails with detail execute if execution fails', () => {
            const execute = (): Result<string> => fail('failed on purpose');
            const init = { ...baseInit, execute };

            const cmd = GenericCommand.create(init).getValueOrThrow();
            expect(cmd.execute('boom', 'context')).toFailWithDetail(
                /failed on purpose/i,
                'execute',
            );
        });
    });

    describe('format method', () => {
        const formatter = (format: string, value: string): Result<string> => {
            return succeed(`Got ${format.replace('{{text}}', value)}`);
        };

        test('formats a successful result using the supplied formatter', () => {
            const init = { ...baseInit };

            const cmd = new GenericCommand(init);
            const cmdResult = cmd.execute('hello', 'context');
            expect(cmd.format(cmdResult, formatter)).toSucceedWith('Got hello+context');
        });

        test('propagates failure for an unsuccessful result', () => {
            const execute = (): Result<string> => fail('failed on purpose');
            const init = { ...baseInit, execute };

            const cmd = GenericCommand.create(init).getValueOrThrow();
            expect(cmd.format(cmd.execute('boom', 'context'), formatter)).toFailWith(
                /failed on purpose/i,
            );
        });
    });

    describe('getDefaultFormatter method', () => {
        test('formats with the default formatter', () => {
            const formatFunction = (format: string, value: string): Result<string> => {
                return succeed(`Got ${format.replace('{{text}}', value)}`);
            };
            const getDefaultFormatter = jest.fn((): Result<Formatter<string>> => succeed(formatFunction));
            const init = { ...baseInit, getDefaultFormatter };

            const cmd = GenericCommand.create(init).getValueOrThrow();
            const executeResult = cmd.execute('hello', 'context');
            expect(cmd.getDefaultFormatter('text')).toSucceedAndSatisfy((formatter: Formatter<string>) => {
                expect(getDefaultFormatter).toHaveBeenCalledWith('text');
                expect(cmd.format(executeResult, formatter)).toSucceedWith('Got hello+context');
            });
        });

        test('fails if no formatter factory is defined', () => {
            const init = { ...baseInit };
            const cmd = new GenericCommand(init);
            expect(cmd.getDefaultFormatter('text')).toFailWith(/no formatter factory/i);
        });
    });
});
