// Lugascript Plugin – embed Luganda programming language on any website
(function() {
    // ==================== LEXER ====================
    const TokenType = {
        NUMBER: 'NUMBER',
        STRING: 'STRING',
        IDENTIFIER: 'IDENTIFIER',
        KEYWORD: 'KEYWORD',
        OPERATOR: 'OPERATOR',
        PUNCTUATION: 'PUNCTUATION',
        EOF: 'EOF'
    };

    const keywords = new Set(['kola', 'nga', 'singa', 'obanga', 'omulimu', 'zza', 'lagisa', 'kwa', 'true', 'false', 'nululu']);

    function tokenize(source) {
        const tokens = [];
        let i = 0;
        const length = source.length;

        while (i < length) {
            let ch = source[i];
            if (/\s/.test(ch)) { i++; continue; }
            if (ch === '/' && source[i+1] === '/') {
                while (i < length && source[i] !== '\n') i++;
                i++;
                continue;
            }
            if (/\d/.test(ch)) {
                let value = '';
                while (i < length && /\d/.test(source[i])) value += source[i++];
                tokens.push({ type: TokenType.NUMBER, value: Number(value) });
                continue;
            }
            if (ch === '"' || ch === "'") {
                const quote = ch;
                i++;
                let value = '';
                while (i < length && source[i] !== quote) value += source[i++];
                i++;
                tokens.push({ type: TokenType.STRING, value });
                continue;
            }
            if (/[a-zA-Z_]/.test(ch)) {
                let ident = '';
                while (i < length && /[a-zA-Z0-9_]/.test(source[i])) ident += source[i++];
                tokens.push({ type: keywords.has(ident) ? TokenType.KEYWORD : TokenType.IDENTIFIER, value: ident });
                continue;
            }
            // punctuation: parentheses, braces, brackets, semicolon, comma, dot
            if ('(){}[];,.'.includes(ch)) {
                tokens.push({ type: TokenType.PUNCTUATION, value: ch });
                i++;
                continue;
            }
            // operators (including multi-character)
            if ('+-*/%=<>!'.includes(ch)) {
                let op = ch;
                if (i+1 < length && '=<>!'.includes(ch) && source[i+1] === '=') {
                    op += source[i+1];
                    i++;
                } else if (ch === '*' && source[i+1] === '*') {
                    op = '**';
                    i++;
                }
                tokens.push({ type: TokenType.OPERATOR, value: op });
                i++;
                continue;
            }
            if (ch === ':') {
                tokens.push({ type: TokenType.OPERATOR, value: ':' });
                i++;
                continue;
            }
            throw new Error(`Akabonero akataliiko: ${ch}`);
        }
        tokens.push({ type: TokenType.EOF });
        return tokens;
    }

    // ==================== PARSER ====================
    const NodeType = {
        Program: 'Program', VarDecl: 'VarDecl', Assignment: 'Assignment', WhileLoop: 'WhileLoop', ForLoop: 'ForLoop',
        IfStatement: 'IfStatement', FuncDecl: 'FuncDecl', Call: 'Call', Return: 'Return', Print: 'Print',
        Binary: 'Binary', Identifier: 'Identifier', Number: 'Number', String: 'String', Block: 'Block',
        ArrayLiteral: 'ArrayLiteral', ObjectLiteral: 'ObjectLiteral', MemberAccess: 'MemberAccess', MethodCall: 'MethodCall'
    };

    class Parser {
        constructor(tokens) { this.tokens = tokens; this.pos = 0; }
        peek() { return this.tokens[this.pos]; }
        consume(type, val = null) {
            const t = this.peek();
            if (!t) throw new Error("Amagezi agakomekkereza");
            if (t.type !== type) throw new Error(`Byali bibuusibwa: ${type}, olina: ${t.type}`);
            if (val !== null && t.value !== val) throw new Error(`Byali bibuusibwa: ${val}, olina: ${t.value}`);
            this.pos++;
            return t;
        }
        parseProgram() {
            const statements = [];
            while (this.peek().type !== TokenType.EOF) statements.push(this.parseStatement());
            return { type: NodeType.Program, statements };
        }
        parseStatement() {
            const t = this.peek();
            if (t.type === TokenType.KEYWORD) {
                switch (t.value) {
                    case 'kola': return this.parseVarDecl();
                    case 'nga': return this.parseWhile();
                    case 'kwa': return this.parseForLoop();
                    case 'singa': return this.parseIf();
                    case 'omulimu': return this.parseFuncDecl();
                    case 'lagisa': return this.parsePrint();
                    case 'zza': return this.parseReturn();
                    default: throw new Error(`Ekigambo kya Luganda kikya? ${t.value}`);
                }
            } else if (t.type === TokenType.IDENTIFIER && this.tokens[this.pos+1]?.value === '=') {
                const id = this.consume(TokenType.IDENTIFIER);
                this.consume(TokenType.OPERATOR, '=');
                const expr = this.parseExpression();
                if (this.peek().type === TokenType.PUNCTUATION && this.peek().value === ';') this.pos++;
                return { type: NodeType.Assignment, name: id.value, value: expr };
            } else if (t.type === TokenType.PUNCTUATION && t.value === '{') {
                return this.parseBlock();
            } else {
                const expr = this.parseExpression();
                if (this.peek().type === TokenType.PUNCTUATION && this.peek().value === ';') this.pos++;
                return expr;
            }
        }
        parseVarDecl() {
            this.consume(TokenType.KEYWORD, 'kola');
            const name = this.consume(TokenType.IDENTIFIER);
            let value = null;
            if (this.peek().type === TokenType.OPERATOR && this.peek().value === '=') {
                this.pos++;
                value = this.parseExpression();
            }
            if (this.peek().type === TokenType.PUNCTUATION && this.peek().value === ';') this.pos++;
            return { type: NodeType.VarDecl, name: name.value, value };
        }
        parseWhile() {
            this.consume(TokenType.KEYWORD, 'nga');
            this.consume(TokenType.PUNCTUATION, '(');
            const cond = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, ')');
            const body = this.parseBlock();
            return { type: NodeType.WhileLoop, condition: cond, body };
        }
        parseForLoop() {
            this.consume(TokenType.KEYWORD, 'kwa');
            this.consume(TokenType.PUNCTUATION, '(');
            const init = this.parseStatement();
            const cond = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, ';');
            const update = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, ')');
            const body = this.parseBlock();
            return { type: NodeType.ForLoop, init, condition: cond, update, body };
        }
        parseIf() {
            this.consume(TokenType.KEYWORD, 'singa');
            this.consume(TokenType.PUNCTUATION, '(');
            const cond = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, ')');
            const thenBlock = this.parseBlock();
            let elseBlock = null;
            if (this.peek().type === TokenType.KEYWORD && this.peek().value === 'obanga') {
                this.pos++;
                elseBlock = this.parseBlock();
            }
            return { type: NodeType.IfStatement, condition: cond, thenBranch: thenBlock, elseBranch: elseBlock };
        }
        parseFuncDecl() {
            this.consume(TokenType.KEYWORD, 'omulimu');
            const name = this.consume(TokenType.IDENTIFIER);
            this.consume(TokenType.PUNCTUATION, '(');
            const params = [];
            while (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== ')') {
                params.push(this.consume(TokenType.IDENTIFIER).value);
                if (this.peek().value === ',') this.pos++;
            }
            this.consume(TokenType.PUNCTUATION, ')');
            const body = this.parseBlock();
            return { type: NodeType.FuncDecl, name: name.value, params, body };
        }
        parsePrint() {
            this.consume(TokenType.KEYWORD, 'lagisa');
            this.consume(TokenType.PUNCTUATION, '(');
            const expr = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, ')');
            if (this.peek().value === ';') this.pos++;
            return { type: NodeType.Print, expression: expr };
        }
        parseReturn() {
            this.consume(TokenType.KEYWORD, 'zza');
            const expr = this.parseExpression();
            if (this.peek().value === ';') this.pos++;
            return { type: NodeType.Return, value: expr };
        }
        parseBlock() {
            this.consume(TokenType.PUNCTUATION, '{');
            const statements = [];
            while (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== '}') {
                statements.push(this.parseStatement());
            }
            this.consume(TokenType.PUNCTUATION, '}');
            return { type: NodeType.Block, statements };
        }
        parseExpression() { return this.parseBinary(0); }
        getPrec(op) {
            if (op === '**') return 4;
            if (op === '*' || op === '/') return 3;
            if (op === '+' || op === '-') return 2;
            if (op === '<' || op === '<=' || op === '>' || op === '>=') return 1;
            if (op === '==' || op === '!=') return 0;
            return -1;
        }
        parseBinary(minP) {
            let left = this.parsePrimary();
            while (true) {
                const t = this.peek();
                if (t.type !== TokenType.OPERATOR) break;
                const op = t.value;
                const prec = this.getPrec(op);
                if (prec < minP) break;
                this.pos++;
                const right = this.parseBinary(prec + 1);
                left = { type: NodeType.Binary, operator: op, left, right };
            }
            return left;
        }
        parsePrimary() {
            const t = this.peek();
            if (t.type === TokenType.NUMBER) { this.pos++; return { type: NodeType.Number, value: t.value }; }
            if (t.type === TokenType.STRING) { this.pos++; return { type: NodeType.String, value: t.value }; }
            if (t.type === TokenType.IDENTIFIER) {
                let id = this.consume(TokenType.IDENTIFIER);
                if (this.peek().type === TokenType.PUNCTUATION && this.peek().value === '(') {
                    return this.parseCall(id.value);
                }
                // member access (dot or bracket)
                let obj = { type: NodeType.Identifier, name: id.value };
                while (this.peek().type === TokenType.PUNCTUATION && (this.peek().value === '[' || this.peek().value === '.')) {
                    const op = this.peek().value;
                    this.pos++;
                    if (op === '.') {
                        const prop = this.consume(TokenType.IDENTIFIER);
                        obj = { type: NodeType.MemberAccess, object: obj, property: prop.value, computed: false };
                    } else {
                        const idx = this.parseExpression();
                        this.consume(TokenType.PUNCTUATION, ']');
                        obj = { type: NodeType.MemberAccess, object: obj, property: idx, computed: true };
                    }
                }
                if (this.peek().type === TokenType.PUNCTUATION && this.peek().value === '(') {
                    const args = [];
                    this.consume(TokenType.PUNCTUATION, '(');
                    while (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== ')') {
                        args.push(this.parseExpression());
                        if (this.peek().value === ',') this.pos++;
                    }
                    this.consume(TokenType.PUNCTUATION, ')');
                    return { type: NodeType.MethodCall, object: obj.object, method: obj.property, arguments: args, computed: obj.computed };
                }
                return obj;
            }
            if (t.type === TokenType.PUNCTUATION && t.value === '[') {
                this.pos++;
                const elems = [];
                while (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== ']') {
                    elems.push(this.parseExpression());
                    if (this.peek().value === ',') this.pos++;
                }
                this.consume(TokenType.PUNCTUATION, ']');
                return { type: NodeType.ArrayLiteral, elements: elems };
            }
            if (t.type === TokenType.PUNCTUATION && t.value === '{') {
                this.pos++;
                const props = [];
                while (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== '}') {
                    const key = this.consume(TokenType.IDENTIFIER);
                    this.consume(TokenType.OPERATOR, ':');
                    const val = this.parseExpression();
                    props.push({ key: key.value, value: val });
                    if (this.peek().value === ',') this.pos++;
                }
                this.consume(TokenType.PUNCTUATION, '}');
                return { type: NodeType.ObjectLiteral, properties: props };
            }
            if (t.type === TokenType.PUNCTUATION && t.value === '(') {
                this.pos++;
                const expr = this.parseExpression();
                this.consume(TokenType.PUNCTUATION, ')');
                return expr;
            }
            throw new Error(`Sikyatwala: ${t.type}`);
        }
        parseCall(callee) {
            this.consume(TokenType.PUNCTUATION, '(');
            const args = [];
            while (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== ')') {
                args.push(this.parseExpression());
                if (this.peek().value === ',') this.pos++;
            }
            this.consume(TokenType.PUNCTUATION, ')');
            return { type: NodeType.Call, callee, arguments: args };
        }
    }

    // ==================== INTERPRETER ====================
    class Environment {
        constructor(parent = null) {
            this.parent = parent;
            this.vars = new Map();
            this.funcs = new Map();
        }
        declare(name, value) { this.vars.set(name, value); }
        get(name) {
            if (this.vars.has(name)) return this.vars.get(name);
            if (this.parent) return this.parent.get(name);
            throw new Error(`Omukaziiko "${name}" teguyimiridde!`);
        }
        set(name, value) {
            if (this.vars.has(name)) this.vars.set(name, value);
            else if (this.parent) this.parent.set(name, value);
            else throw new Error(`Omukaziiko "${name}" teguyimiridde!`);
        }
        defineFunc(name, node) { this.funcs.set(name, node); }
        getFunc(name) {
            if (this.funcs.has(name)) return this.funcs.get(name);
            if (this.parent) return this.parent.getFunc(name);
            throw new Error(`Omulimu "${name}" teguwandiikiddwa!`);
        }
    }

    function installArrayMethods(arr) {
        arr.map = function(fn) {
            const res = [];
            for (let i = 0; i < arr.length; i++) res.push(fn(arr[i], i, arr));
            return res;
        };
        arr.forEach = function(fn) {
            for (let i = 0; i < arr.length; i++) fn(arr[i], i, arr);
        };
        arr.reduce = function(fn, init) {
            let acc = init;
            for (let i = 0; i < arr.length; i++) acc = fn(acc, arr[i], i, arr);
            return acc;
        };
        return arr;
    }

    function evaluate(node, env, outputCallback) {
        switch (node.type) {
            case NodeType.Program:
                for (const stmt of node.statements) evaluate(stmt, env, outputCallback);
                break;
            case NodeType.VarDecl:
                let val = node.value ? evaluate(node.value, env, outputCallback) : null;
                env.declare(node.name, val);
                break;
            case NodeType.Assignment:
                const assignVal = evaluate(node.value, env, outputCallback);
                env.set(node.name, assignVal);
                break;
            case NodeType.Block:
                const blockEnv = new Environment(env);
                for (const stmt of node.statements) evaluate(stmt, blockEnv, outputCallback);
                break;
            case NodeType.WhileLoop:
                while (evaluate(node.condition, env, outputCallback) !== false) {
                    evaluate(node.body, env, outputCallback);
                }
                break;
            case NodeType.ForLoop:
                const fenv = new Environment(env);
                evaluate(node.init, fenv, outputCallback);
                while (evaluate(node.condition, fenv, outputCallback) !== false) {
                    evaluate(node.body, fenv, outputCallback);
                    evaluate(node.update, fenv, outputCallback);
                }
                break;
            case NodeType.IfStatement:
                const cond = evaluate(node.condition, env, outputCallback);
                if (cond !== false) evaluate(node.thenBranch, env, outputCallback);
                else if (node.elseBranch) evaluate(node.elseBranch, env, outputCallback);
                break;
            case NodeType.FuncDecl:
                env.defineFunc(node.name, node);
                break;
            case NodeType.Return:
                throw { type: 'return', value: evaluate(node.value, env, outputCallback) };
            case NodeType.Call:
                const fn = env.getFunc(node.callee);
                const callEnv = new Environment(env);
                for (let i = 0; i < fn.params.length; i++) {
                    callEnv.declare(fn.params[i], evaluate(node.arguments[i], env, outputCallback));
                }
                try {
                    evaluate(fn.body, callEnv, outputCallback);
                    return undefined;
                } catch (e) {
                    if (e.type === 'return') return e.value;
                    throw e;
                }
            case NodeType.Print:
                const out = evaluate(node.expression, env, outputCallback);
                if (outputCallback) outputCallback(String(out));
                else console.log(out);
                break;
            case NodeType.Binary:
                const left = evaluate(node.left, env, outputCallback);
                const right = evaluate(node.right, env, outputCallback);
                switch (node.operator) {
                    case '+': return left + right;
                    case '-': return left - right;
                    case '*': return left * right;
                    case '/': return left / right;
                    case '%': return left % right;
                    case '**': return Math.pow(left, right);
                    case '<': return left < right;
                    case '<=': return left <= right;
                    case '>': return left > right;
                    case '>=': return left >= right;
                    case '==': return left === right;
                    case '!=': return left !== right;
                    default: throw new Error(`Omulimu ogutamanyibwa: ${node.operator}`);
                }
            case NodeType.Identifier:
                return env.get(node.name);
            case NodeType.Number:
                return node.value;
            case NodeType.String:
                return node.value;
            case NodeType.ArrayLiteral:
                const arr = node.elements.map(e => evaluate(e, env, outputCallback));
                return installArrayMethods(arr);
            case NodeType.ObjectLiteral:
                const obj = {};
                for (const prop of node.properties) obj[prop.key] = evaluate(prop.value, env, outputCallback);
                return obj;
            case NodeType.MemberAccess:
                const target = evaluate(node.object, env, outputCallback);
                if (node.computed) {
                    const idx = evaluate(node.property, env, outputCallback);
                    return target[idx];
                } else {
                    return target[node.property];
                }
            case NodeType.MethodCall:
                const targetObj = evaluate(node.object, env, outputCallback);
                const meth = node.method;
                const args = node.arguments.map(a => evaluate(a, env, outputCallback));
                if (typeof targetObj[meth] === 'function') {
                    return targetObj[meth].apply(targetObj, args);
                }
                throw new Error(`Omulimu "${meth}" tagulabika ku kintu ekyo`);
            default:
                throw new Error(`Amakosa mu kutegeera: ${node.type}`);
        }
    }

    function runLugascript(source, outputCallback) {
        const tokens = tokenize(source);
        const parser = new Parser(tokens);
        const ast = parser.parseProgram();
        const globalEnv = new Environment();
        globalEnv.declare('true', true);
        globalEnv.declare('false', false);
        globalEnv.declare('nululu', null);
        evaluate(ast, globalEnv, outputCallback);
    }

    // ==================== EXPOSE GLOBAL API ====================
    window.Lugascript = {
        version: '1.0.0',
        run: function(source, options = {}) {
            const outputCallback = options.output || function(text) {
                if (options.console !== false) console.log(text);
                if (options.container) {
                    const div = document.createElement('div');
                    div.textContent = text;
                    options.container.appendChild(div);
                }
            };
            try {
                runLugascript(source, outputCallback);
                return { success: true };
            } catch (err) {
                if (options.errorCallback) options.errorCallback(err.message);
                else console.error(err);
                return { success: false, error: err.message };
            }
        },
        // Helper to run all script tags with type="text/lugascript"
        runScriptTags: function() {
            document.querySelectorAll('script[type="text/lugascript"]').forEach(script => {
                const source = script.textContent;
                window.Lugascript.run(source);
            });
        }
    };

    // Auto-run any script tags when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.Lugascript.runScriptTags());
    } else {
        window.Lugascript.runScriptTags();
    }
})();
