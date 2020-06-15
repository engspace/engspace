import { CharIterator } from '../util';
import { BadRefNamingFormatError, Naming } from '.';

export enum Kind {
    Lit,
    Var,
}

export interface LitToken {
    kind: Kind.Lit;
    value: string;
}

export interface VarToken {
    kind: Kind.Var;
    ident: string;
    arg?: string;
}

export type Token = LitToken | VarToken;

export function parseVar(inp: CharIterator, allowedVars: string[]): VarToken {
    /* istanbul ignore next */
    if (inp.read(2) != '${') {
        throw new Error('variables start with "${');
    }
    const content = inp.readUntil('}', { throws: true, including: false });
    inp.next(); // eat '}'

    const [ident, arg] = content.split(':');
    if (!allowedVars.includes(ident)) {
        throw new BadRefNamingFormatError(`unknown variable "${ident}"`);
    }
    return {
        kind: Kind.Var,
        ident,
        arg,
    };
}

export function parseLiteral(inp: CharIterator): LitToken {
    return {
        kind: Kind.Lit,
        value: inp.readUntil('${', { throws: false, including: false }),
    };
}

export function parseNaming(
    inp: CharIterator,
    allowedVars: string[],
    requiredVars: string[] = []
): Token[] {
    const toks = [];
    while (!inp.done) {
        if (inp.lookAhead(2) === '${') {
            const vtok = parseVar(inp, allowedVars);
            requiredVars = requiredVars.filter((v) => v !== vtok.ident);
            toks.push(vtok);
        } else {
            toks.push(parseLiteral(inp));
        }
    }

    if (requiredVars.length) {
        const vars = requiredVars.join('\n - ');
        throw new BadRefNamingFormatError(
            `missing required variable(s) in naming format:\n - ${vars}`
        );
    }
    return toks;
}

export interface TokenConfig<VarTok extends VarToken> {
    mapTok(tok: VarToken): VarTok;
}

export abstract class NamingBase<Comps, VarTok extends VarToken> implements Naming<Comps> {
    protected readonly tokens: (LitToken | VarTok)[];
    constructor(
        input: string,
        tokenConf: TokenConfig<VarTok>,
        allowedVars: string[],
        requiredVars: string[] = []
    ) {
        const tokens = parseNaming(new CharIterator(input), allowedVars, requiredVars);
        this.tokens = tokens.map((t) => {
            switch (t.kind) {
                case Kind.Lit:
                    return t;
                case Kind.Var:
                    return tokenConf.mapTok(t);
            }
        });
    }

    protected abstract compSeg(tok: VarTok, comps: Comps): string;

    buildName(comps: Comps): string {
        const segs = [];
        for (const tok of this.tokens) {
            switch (tok.kind) {
                case Kind.Lit: {
                    segs.push(tok.value);
                    break;
                }
                case Kind.Var: {
                    segs.push(this.compSeg(tok, comps));
                    break;
                }
            }
        }
        return segs.join('');
    }

    abstract extractComps(name: string): Comps;
}
