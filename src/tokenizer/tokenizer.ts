/**
 * 词法分析器，核心算法是DFA，参考:../../01_词法分析/README.md
 */

import { LexicalError } from '../common/LexicalError'


interface Token {
    type: string
    value: string
    lineNo?: number
}

export class Tokenizer {
    public tokens: Array<Token> = []
    readonly KEYWORDS: Array<string> = [
        'var',
        'if',
        'else',
        'while',
        'for',
        'break',
        'continue',
        'function',
        'return',
    ]
    constructor(sourceCode: string) {
        this.scanner(sourceCode)
    }
    //token生成器
    private makeToken(type: string, value: string, lineNo?: number): Token {
        return { type, value, lineNo }
    }
    //源码扫描器
    private scanner(sourceCode: string): void {
        this.tokens = []
        let codeIndex: number = 0   //当前扫描到源码的第codeIndex个字符
        let lineNo: number = 0  //行号
        //自动机装饰器
        function decorator(automation_func): Function {
            return (...args) => {
                const token: Token = automation_func(...args)
                codeIndex += token.value.length
                token.lineNo = lineNo
                this.tokens.push(token)
            }
        }
        const getTokenLiteral: Function = decorator.call(this, this.literalAutomat.bind(this))
        const getTokenNumber: Function = decorator.call(this, this.numberAutomat.bind(this))
        const getTokenOp: Function = decorator.call(this, this.operatorAutomat.bind(this))
        while (codeIndex < sourceCode.length) {
            const currentChar: string = sourceCode[codeIndex]
            if (currentChar.match(/[A-Za-z]/)) {
                getTokenLiteral(sourceCode, codeIndex)
            } else if (currentChar.match(/[0-9.]/)) {
                getTokenNumber(sourceCode, codeIndex)
            }
            else if (currentChar.match(/[+-\\*/&|=!;()]/)) {
                getTokenOp(sourceCode, codeIndex)
            } else if (currentChar === '{' || currentChar === '}') {
                codeIndex++
                this.tokens.push(this.makeToken('block', currentChar, lineNo))

            } else if (currentChar === '\n' || currentChar === '\r') {
                codeIndex++
                lineNo++
                continue
            } else if (currentChar === ' ' || currentChar === '\t') {
                codeIndex++
                continue
            } else {
                throw new LexicalError(`lexical error:unexpected char ${currentChar} in line ${lineNo} `)
            }
        }
    }

    //变量自动机
    private literalAutomat(sourceCode: string, index: number): Token {
        let state: number = 0
        let str: string = ''
        function getNextChar(): string {
            return sourceCode[index++]
        }
        while (true) {
            switch (state) {
                case 0: {
                    const nextChar: string = getNextChar()
                    if (nextChar.match(/[A-Za-z]/)) {
                        str += nextChar
                        state = 1
                    } else {
                        throw new LexicalError('not a illegal operator')
                    }
                    break
                }
                case 1: {
                    const nextChar: string = getNextChar()
                    if (nextChar && nextChar.match(/[A-Za-z0-9]/)) {
                        str += nextChar
                    } else {
                        if (this.KEYWORDS.indexOf(str) > -1) {
                            return this.makeToken('keyword', str)
                        } else {
                            return this.makeToken('id', str)
                        }
                    }
                    break
                }
            }
        }
    }

    //数字自动机
    private numberAutomat(sourceCode: string, index: number): Token {
        let state: number = 0
        let num: string = ''
        while (true) {
            const nextChar: string = sourceCode[index++]
            switch (state) {
                case 0: {
                    if (nextChar === '0') {
                        num += nextChar
                        state = 2
                    } else if (nextChar.match(/^[0-9]$/)) {
                        num += nextChar
                        state = 1
                    } else if (nextChar === '.') {
                        num += nextChar
                        state = 3
                    } else {
                        throw new LexicalError('not a number')
                    }
                    break
                }
                case 1: {
                    if (nextChar.match(/[0-9]/)) {
                        num += nextChar
                    } else {
                        return this.makeToken('number', num)
                    }
                    break
                }
                case 2: {
                    if (nextChar.match(/[1-9]/)) {
                        num += nextChar
                        state = 1
                    } else if (nextChar === '.') {
                        num += nextChar
                        state = 4
                    } else {
                        return this.makeToken('number', num)
                    }
                    break
                }
                case 3: {
                    if (nextChar.match(/[0-9]/)) {
                        state = 5
                        num += nextChar
                    } else {
                        throw new LexicalError('not a number')
                    }
                }
                case 4: {
                    if (nextChar.match(/[0-9]/)) {
                        state = 5
                        num += nextChar
                    } else {
                        return this.makeToken('number', num)
                    }
                    break
                }
                case 5: {
                    if (nextChar.match(/[0-9]/)) {
                        num += nextChar
                    } else {
                        return this.makeToken('number', num)
                    }
                }
            }
        }
    }

    //运算符自动机
    private operatorAutomat(sourceCode: string, index: number): Token {
        let state: number = 0
        let operator: string = ''
        while (true) {
            const nextChar = sourceCode[index++]
            operator += nextChar
            switch (state) {
                case 0: {
                    switch (nextChar) {
                        case '+':
                            state = 1
                            break
                        case '-':
                            state = 2
                            break
                        case '*':
                        case '/':
                            return this.makeToken('operator', operator)
                        case '=':
                            state = 5
                            break
                        case '&':
                            state = 6
                            break
                        case '|':
                            state = 7
                            break
                        case '>':
                            state = 8
                            break
                        case '<':
                            state = 9
                            break
                        case '!':
                            state = 10
                            break
                        case '(':
                        case ')':
                        case ';':
                            return this.makeToken('operator', operator)
                        default:
                            throw new LexicalError('not an operator')
                    }
                    break

                }
                case 1: {
                    if (nextChar === '+') {
                        return this.makeToken('operator', '++')
                    }
                    return this.makeToken('operator', '+')
                }
                case 2: {
                    if (nextChar === '-') {
                        return this.makeToken('operator', '--')
                    }
                    return this.makeToken('operator', '-')
                }

                case 5: {
                    if (nextChar === '=') {
                        return this.makeToken('operator', '==')
                    }
                    return this.makeToken('operator', '=')
                }
                case 6: {
                    if (nextChar === '&') {
                        return this.makeToken('operator', '&&')
                    }
                    return this.makeToken('operator', '&')

                }
                case 7: {
                    if (nextChar === '|') {
                        return this.makeToken('operator', '||')
                    }
                    return this.makeToken('operator', '|')
                }
                case 8: {
                    if (nextChar === '=') {
                        return this.makeToken('operator', '>=')
                    }
                    return this.makeToken('operator', '>')
                }
                case 9: {
                    if (nextChar === '=') {
                        return this.makeToken('operator', '<=')
                    }
                    return this.makeToken('operator', '<')
                }
                case 10: {
                    if (nextChar === '=') {
                        return this.makeToken('operator', '!=')
                    }
                    return this.makeToken('operator', '!')
                }
                default:
                    throw new LexicalError('not an operator')
            }

        }
    }
}

//代码测试
let tokenizer = new Tokenizer('var myName = jacksplwxy + test')
console.log('结果:', tokenizer.tokens)