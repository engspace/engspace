import { CharIterator } from '../util';

export {
    PartRefComps,
    PartRefFormatMismatchError,
    PartRefNaming,
    FamilyCounterLimitError,
} from './part-ref';

export class BadRefNamingFormatError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BadRefNamingFormatError';
        Error.captureStackTrace(this, BadRefNamingFormatError);
    }
}

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
    arg: string;
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

export function parseNaming(inp: CharIterator, allowedVars: string[]): Token[] {
    const toks = [];
    while (!inp.done) {
        if (inp.lookAhead(2) === '${') {
            toks.push(parseVar(inp, allowedVars));
        } else {
            toks.push(parseLiteral(inp));
        }
    }
    return toks;
}

export interface Naming<Comps> {
    buildName(comps: Comps): string;
    extractComps(name: string): Comps;
}
