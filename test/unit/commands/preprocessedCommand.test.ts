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
import { Converters, Result, fail, succeed } from '@fgv/ts-utils';
import { GenericCommandPreprocessor, ParserBuilder } from '../../../src/commands';

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

describe('PreprocessedCommand module', () => {
    // testing PreprocessedCommandBase, GenericPreprocessedCommand
    // and CommandPreprocessorBase via GenericCommandPreprocessor
    describe('GenericCommandPreprocessor class', () => {
        const baseInit = {
            name: 'test',
            repeatable: true,
            parser: wordParser,
            getConverter: () => paramsConverter,
            execute: () => succeed('base'),
            format: '{{result}}',
        };

        describe('preprocess method', () => {
            test('propagates base properties', () => {
                const init = baseInit;
                const preprocessor = GenericCommandPreprocessor.create(init).getValueOrThrow();
                const cmd = preprocessor.preprocess('hello', 'context').getValueOrThrow();

                expect(cmd.name).toEqual(init.name);
                expect(cmd.repeatable).toEqual(init.repeatable);
            });

            test('does not invoke execute on command creation', () => {
                const execute = jest.fn(fakeExec);
                const init = { ...baseInit, execute };

                const preprocessor = GenericCommandPreprocessor.create(init).getValueOrThrow();
                expect(execute).not.toHaveBeenCalled();

                const cmd = preprocessor.preprocess('hello', 'context').getValueOrThrow();
                expect(execute).not.toHaveBeenCalled();

                expect(cmd.execute()).toSucceedWith('hello+context');
                expect(execute).toHaveBeenCalled();
            });

            test('fails with detail parse if string does not match', () => {
                const execute = jest.fn(() => succeed('okay'));
                const init = { ...baseInit, parser: numberParser, execute };

                const preprocessor = GenericCommandPreprocessor.create(init).getValueOrThrow();
                expect(preprocessor.preprocess('not a number', 'context')).toFailWithDetail(
                    /no match/i,
                    'parse',
                );
            });

            test('fails with detail internal if parser encounters an error', () => {
                const init = { ...baseInit, parser: brokenParser };

                const preprocessor = GenericCommandPreprocessor.create(init).getValueOrThrow();
                expect(preprocessor.preprocess('not working', 'context')).toFailWithDetail(
                    /mismatched/i,
                    'internal',
                );
            });

            test('fails with detail internal if creating converter fails', () => {
                const getConverter = () => { throw new Error('oops'); };
                const init = { ...baseInit, getConverter };

                const preprocessor = GenericCommandPreprocessor.create(init).getValueOrThrow();
                expect(preprocessor.preprocess('boom', 'context')).toFailWithDetail(
                    /oops/i,
                    'internal',
                );
            });

            test('fails with detail validate if conversion fails', () => {
                const init = { ...baseInit, parser: boolParser };

                const preprocessor = GenericCommandPreprocessor.create(init).getValueOrThrow();
                expect(preprocessor.preprocess('boom', 'context')).toFailWithDetail(
                    /not a boolean/i,
                    'validate',
                );
            });
        });

        describe('preprocessed execute method', () => {
            test('invokes supplied method multiple times for a repeatable command', () => {
                const execute = jest.fn(fakeExec);
                const init = { ...baseInit, repeatable: true, execute };

                const preprocessor = new GenericCommandPreprocessor(init);
                expect(execute).not.toHaveBeenCalled();

                const cmd = preprocessor.preprocess('hello', 'context').getValueOrThrow();
                expect(cmd.execute()).toSucceedWith('hello+context');
                expect(execute).toHaveBeenCalledTimes(1);

                expect(cmd.execute()).toSucceedWith('hello+context');
                expect(execute).toHaveBeenCalledTimes(2);
            });

            test('fails subsequent execute calls for a non-repeatable command', () => {
                const execute = jest.fn(fakeExec);
                const init = { ...baseInit, repeatable: false, execute };

                const preprocessor = new GenericCommandPreprocessor(init);
                expect(execute).not.toHaveBeenCalled();

                const cmd = preprocessor.preprocess('hello', 'context').getValueOrThrow();
                expect(cmd.execute()).toSucceedWith('hello+context');
                expect(execute).toHaveBeenCalledTimes(1);

                expect(cmd.execute()).toFailWith(/cannot be repeated/i);
                expect(execute).toHaveBeenCalledTimes(1);
            });


            test('calls format method on successful execution', () => {
                const execute = jest.fn(fakeExec);
                const format = jest.fn(() => succeed('dynamic format'));
                const init = { ...baseInit, repeatable: false, execute, format };

                const preprocessor = new GenericCommandPreprocessor(init);
                const cmd = preprocessor.preprocess('hello', 'context').getValueOrThrow();
                expect(cmd.execute()).toSucceedWith('hello+context');
                expect(format).toHaveBeenCalledWith({ word: 'hello' }, 'context', 'hello+context');
            });

            test('fails with detail format if format selection fails', () => {
                const execute = jest.fn(fakeExec);
                const format = jest.fn((): Result<string> => fail('oops'));
                const init = { ...baseInit, repeatable: false, execute, format };

                const preprocessor = new GenericCommandPreprocessor(init);
                const cmd = preprocessor.preprocess('hello', 'context').getValueOrThrow();
                expect(cmd.execute()).toFailWithDetail('oops', 'format');
            });

            test('fails with detail execute if execution fails', () => {
                const execute = jest.fn((): Result<string> => fail('oops'));
                const init = { ...baseInit, repeatable: false, execute };

                const preprocessor = new GenericCommandPreprocessor(init);
                const cmd = preprocessor.preprocess('hello', 'context').getValueOrThrow();
                expect(cmd.execute()).toFailWithDetail('oops', 'execute');
            });
        });
    });
});
