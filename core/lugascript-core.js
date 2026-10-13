// lugascript-core.js – Universal Lugascript Interpreter
// Works in Node.js (CommonJS) and browser (global)

(function(root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.LugascriptCore = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {

    const TokenType = {
        NUMBER: 'NUMBER', STRING: 'STRING', IDENTIFIER: 'IDENTIFIER',
        KEYWORD: 'KEYWORD', OPERATOR: 'OPERATOR', PUNCTUATION: 'PUNCTUATION', EOF: 'EOF'
    };

    const keywords = new Set(['kola','nga','singa','obanga','omulimu','zza','lagisa','kwa','true','false','nululu']);

    function tokenize(source) {
        const tokens = [];
        let i = 0, len = source.length;
        while (i < len) {
            let ch = source[i];
            if (/\s/.test(ch)) { i++; continue; }
            if (ch === '/' && source[i+1] === '/') {
                while (i < len && source[i] !== '\n') i++;
                i++; continue;
            }
            if (/\d/.test(ch)) {
                let v = '';
                while (i < len && /\d/.test(source[i])) v += source[i++];
                tokens.push({ type: TokenType.NUMBER, value: Number(v) });
                continue;
            }
            if (ch === '"' || ch === "'") {
                const q = ch; i++;
                let v = '';
                while (i < len && source[i] !== q) v += source[i++];
                i++;
                tokens.push({ type: TokenType.STRING, value: v });
                continue;
            }
            if (/[a-zA-Z_]/.test(ch)) {
                let id = '';
                while (i < len && /[a-zA-Z0-9_]/.test(source[i])) id += source[i++];
                tokens.push({ type: keywords.has(id) ? TokenType.KEYWORD : TokenType.IDENTIFIER, value: id });
                continue;
            }
            if ('(){}[];,.'.includes(ch)) { tokens.push({ type: TokenType.PUNCTUATION, value: ch }); i++; continue; }
            if ('+-*/%=<>!'.includes(ch)) {
                let op = ch;
                if (i+1 < len && '=<>!'.includes(ch) && source[i+1] === '=') { op += source[i+1]; i++; }
                else if (ch === '*' && source[i+1] === '*') { op = '**'; i++; }
                tokens.push({ type: TokenType.OPERATOR, value: op });
                i++; continue;
            }
            if (ch === ':') { tokens.push({ type: TokenType.OPERATOR, value: ':' }); i++; continue; }
            throw new Error(`Akabonero akataliiko: ${ch}`);
        }
        tokens.push({ type: TokenType.EOF });
        return tokens;
    }

    const NodeType = {
        Program:'Program', VarDecl:'VarDecl', Assignment:'Assignment', WhileLoop:'WhileLoop', ForLoop:'ForLoop',
        IfStatement:'IfStatement', FuncDecl:'FuncDecl', Call:'Call', Return:'Return', Print:'Print',
        Binary:'Binary', Identifier:'Identifier', Number:'Number', String:'String', Block:'Block',
        ArrayLiteral:'ArrayLiteral', ObjectLiteral:'ObjectLiteral', MemberAccess:'MemberAccess', MethodCall:'MethodCall'
    };

    class Parser {
        constructor(tokens) { this.tokens = tokens; this.pos = 0; }
        peek() { return this.tokens[this.pos]; }
        consume(type, val = null) {
            const t = this.peek();
            if (!t) throw new Error("Amagezi agakomekkereza");
            if (t.type !== type) throw new Error(`Byali bibuusibwa: ${type}, olina: ${t.type}`);
            if (val !== null && t.value !== val) throw new Error(`Byali bibuusibwa: ${val}, olina: ${t.value}`);
            this.pos++; return t;
        }
        parseProgram() {
            const s = [];
            while (this.peek().type !== TokenType.EOF) s.push(this.parseStatement());
            return { type: NodeType.Program, statements: s };
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
                if (this.peek().value === ';') this.pos++;
                return { type: NodeType.Assignment, name: id.value, value: expr };
            } else if (t.type === TokenType.PUNCTUATION && t.value === '{') {
                return this.parseBlock();
            } else {
                const expr = this.parseExpression();
                if (this.peek().value === ';') this.pos++;
                return expr;
            }
        }
        parseVarDecl() {
            this.consume(TokenType.KEYWORD, 'kola');
            const name = this.consume(TokenType.IDENTIFIER);
            let value = null;
            if (this.peek().type === TokenType.OPERATOR && this.peek().value === '=') { this.pos++; value = this.parseExpression(); }
            if (this.peek().value === ';') this.pos++;
            return { type: NodeType.VarDecl, name: name.value, value };
        }
        parseWhile() {
            this.consume(TokenType.KEYWORD, 'nga');
            this.consume(TokenType.PUNCTUATION, '(');
            const c = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, ')');
            return { type: NodeType.WhileLoop, condition: c, body: this.parseBlock() };
        }
        parseForLoop() {
            this.consume(TokenType.KEYWORD, 'kwa');
            this.consume(TokenType.PUNCTUATION, '(');
            const init = this.parseStatement();
            const cond = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, ';');
            const upd = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, ')');
            return { type: NodeType.ForLoop, init, condition: cond, update: upd, body: this.parseBlock() };
        }
        parseIf() {
            this.consume(TokenType.KEYWORD, 'singa');
            this.consume(TokenType.PUNCTUATION, '(');
            const c = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, ')');
            const tb = this.parseBlock();
            let eb = null;
            if (this.peek().type === TokenType.KEYWORD && this.peek().value === 'obanga') { this.pos++; eb = this.parseBlock(); }
            return { type: NodeType.IfStatement, condition: c, thenBranch: tb, elseBranch: eb };
        }
        parseFuncDecl() {
            this.consume(TokenType.KEYWORD, 'omulimu');
            const name = this.consume(TokenType.IDENTIFIER);
            this.consume(TokenType.PUNCTUATION, '(');
            const p = [];
            while (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== ')') {
                p.push(this.consume(TokenType.IDENTIFIER).value);
                if (this.peek().value === ',') this.pos++;
            }
            this.consume(TokenType.PUNCTUATION, ')');
            return { type: NodeType.FuncDecl, name: name.value, params: p, body: this.parseBlock() };
        }
        parsePrint() {
            this.consume(TokenType.KEYWORD, 'lagisa');
            this.consume(TokenType.PUNCTUATION, '(');
            const e = this.parseExpression();
            this.consume(TokenType.PUNCTUATION, ')');
            if (this.peek().value === ';') this.pos++;
            return { type: NodeType.Print, expression: e };
        }
        parseReturn() {
            this.consume(TokenType.KEYWORD, 'zza');
            const e = this.parseExpression();
            if (this.peek().value === ';') this.pos++;
            return { type: NodeType.Return, value: e };
        }
        parseBlock() {
            this.consume(TokenType.PUNCTUATION, '{');
            const s = [];
            while (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== '}') s.push(this.parseStatement());
            this.consume(TokenType.PUNCTUATION, '}');
            return { type: NodeType.Block, statements: s };
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
                const op = t.value, prec = this.getPrec(op);
                if (prec < minP) break;
                this.pos++;
                left = { type: NodeType.Binary, operator: op, left, right: this.parseBinary(prec + 1) };
            }
            return left;
        }
        parsePrimary() {
            const t = this.peek();
            if (t.type === TokenType.NUMBER) { this.pos++; return { type: NodeType.Number, value: t.value }; }
            if (t.type === TokenType.STRING) { this.pos++; return { type: NodeType.String, value: t.value }; }
            if (t.type === TokenType.IDENTIFIER) {
                const id = this.consume(TokenType.IDENTIFIER);
                if (this.peek().type === TokenType.PUNCTUATION && this.peek().value === '(') return this.parseCall(id.value);
                let obj = { type: NodeType.Identifier, name: id.value };
                while (this.peek().type === TokenType.PUNCTUATION && (this.peek().value === '[' || this.peek().value === '.')) {
                    const op = this.peek().value; this.pos++;
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
                this.pos++; const e = [];
                while (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== ']') {
                    e.push(this.parseExpression());
                    if (this.peek().value === ',') this.pos++;
                }
                this.consume(TokenType.PUNCTUATION, ']');
                return { type: NodeType.ArrayLiteral, elements: e };
            }
            if (t.type === TokenType.PUNCTUATION && t.value === '{') {
                this.pos++; const p = [];
                while (this.peek().type !== TokenType.PUNCTUATION || this.peek().value !== '}') {
                    const k = this.consume(TokenType.IDENTIFIER);
                    this.consume(TokenType.OPERATOR, ':');
                    p.push({ key: k.value, value: this.parseExpression() });
                    if (this.peek().value === ',') this.pos++;
                }
                this.consume(TokenType.PUNCTUATION, '}');
                return { type: NodeType.ObjectLiteral, properties: p };
            }
            if (t.type === TokenType.PUNCTUATION && t.value === '(') {
                this.pos++;
                const e = this.parseExpression();
                this.consume(TokenType.PUNCTUATION, ')');
                return e;
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

    class Environment {
        constructor(parent = null) { this.parent = parent; this.vars = new Map(); this.funcs = new Map(); }
        declare(n, v) { this.vars.set(n, v); }
        get(n) { if (this.vars.has(n)) return this.vars.get(n); if (this.parent) return this.parent.get(n); throw new Error(`Omukaziiko "${n}" teguyimiridde!`); }
        set(n, v) { if (this.vars.has(n)) this.vars.set(n, v); else if (this.parent) this.parent.set(n, v); else throw new Error(`Omukaziiko "${n}" teguyimiridde!`); }
        defineFunc(n, node) { this.funcs.set(n, node); }
        getFunc(n) { if (this.funcs.has(n)) return this.funcs.get(n); if (this.parent) return this.parent.getFunc(n); throw new Error(`Omulimu "${n}" teguwandiikiddwa!`); }
    }

    function installArrayMethods(arr) {
        arr.map = function(fn) { const r = []; for (let i = 0; i < arr.length; i++) r.push(fn(arr[i], i, arr)); return r; };
        arr.forEach = function(fn) { for (let i = 0; i < arr.length; i++) fn(arr[i], i, arr); };
        arr.reduce = function(fn, init) { let a = init; for (let i = 0; i < arr.length; i++) a = fn(a, arr[i], i, arr); return a; };
        return arr;
    }

    function evaluate(node, env, out) {
        switch (node.type) {
            case NodeType.Program: for (const s of node.statements) evaluate(s, env, out); break;
            case NodeType.VarDecl: env.declare(node.name, node.value ? evaluate(node.value, env, out) : null); break;
            case NodeType.Assignment: env.set(node.name, evaluate(node.value, env, out)); break;
            case NodeType.Block: { const e = new Environment(env); for (const s of node.statements) evaluate(s, e, out); break; }
            case NodeType.WhileLoop: while (evaluate(node.condition, env, out) !== false) evaluate(node.body, env, out); break;
            case NodeType.ForLoop: { const e = new Environment(env); evaluate(node.init, e, out); while (evaluate(node.condition, e, out) !== false) { evaluate(node.body, e, out); evaluate(node.update, e, out); } break; }
            case NodeType.IfStatement: { const c = evaluate(node.condition, env, out); if (c !== false) evaluate(node.thenBranch, env, out); else if (node.elseBranch) evaluate(node.elseBranch, env, out); break; }
            case NodeType.FuncDecl: env.defineFunc(node.name, node); break;
            case NodeType.Return: throw { type: 'return', value: evaluate(node.value, env, out) };
            case NodeType.Call: {
                const fn = env.getFunc(node.callee);
                const ce = new Environment(env);
                for (let i = 0; i < fn.params.length; i++) ce.declare(fn.params[i], evaluate(node.arguments[i], env, out));
                try { evaluate(fn.body, ce, out); return undefined; }
                catch (e) { if (e.type === 'return') return e.value; throw e; }
            }
            case NodeType.Print: { const v = evaluate(node.expression, env, out); if (out) out(String(v)); else console.log(v); break; }
            case NodeType.Binary: {
                const l = evaluate(node.left, env, out), r = evaluate(node.right, env, out);
                switch (node.operator) {
                    case '+': return l + r;
                    case '-': return l - r;
                    case '*': return l * r;
                    case '/': return l / r;
                    case '%': return l % r;
                    case '**': return Math.pow(l, r);
                    case '<': return l < r;
                    case '<=': return l <= r;
                    case '>': return l > r;
                    case '>=': return l >= r;
                    case '==': return l === r;
                    case '!=': return l !== r;
                    default: throw new Error(`Omulimu ogutamanyibwa: ${node.operator}`);
                }
            }
            case NodeType.Identifier: return env.get(node.name);
            case NodeType.Number: return node.value;
            case NodeType.String: return node.value;
            case NodeType.ArrayLiteral: return installArrayMethods(node.elements.map(e => evaluate(e, env, out)));
            case NodeType.ObjectLiteral: { const o = {}; for (const p of node.properties) o[p.key] = evaluate(p.value, env, out); return o; }
            case NodeType.MemberAccess: { const t = evaluate(node.object, env, out); return node.computed ? t[evaluate(node.property, env, out)] : t[node.property]; }
            case NodeType.MethodCall: {
                const t = evaluate(node.object, env, out);
                const m = node.method;
                const a = node.arguments.map(x => evaluate(x, env, out));
                if (typeof t[m] === 'function') return t[m].apply(t, a);
                throw new Error(`Omulimu "${m}" tagulabika ku kintu ekyo`);
            }
            default: throw new Error(`Amakosa mu kutegeera: ${node.type}`);
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

    return { run: runLugascript, tokenize, Parser, evaluate, Environment, NodeType, TokenType };
}));
