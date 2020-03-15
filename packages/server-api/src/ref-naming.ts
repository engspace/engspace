import { CharIterator } from './util';
import { PartFamily, PartBase } from '@engspace/core';
import { VersionFormat } from './version-format';

enum Tok {
    Lit,
    Var,
}

interface LitToken {
    tok: Tok.Lit;
    value: string;
}

interface FamCodeToken {
    tok: Tok.Var;
    ident: 'fam_code';
}

interface FamCountToken {
    tok: Tok.Var;
    ident: 'fam_count';
    width: number;
}

interface PartBaseRefToken {
    tok: Tok.Var;
    ident: 'part_base_ref';
}

interface PartVersionToken {
    tok: Tok.Var;
    ident: 'part_version';
    format: VersionFormat;
}

type VarToken = FamCodeToken | FamCountToken | PartBaseRefToken | PartVersionToken;

type Token = LitToken | VarToken;

function parseVar(inp: CharIterator, allowedVars: string[]): VarToken {
    /* istanbul ignore next */
    if (inp.read(2) != '${') {
        throw new Error('variables start with "${');
    }
    const content = inp.readUntil('}', { throws: true, including: false });
    inp.next(); // eat '}'

    const [ident, arg] = content.split(':');
    if (!allowedVars.includes(ident)) {
        throw new Error(`unknown variable "${ident}"`);
    }

    switch (ident) {
        case 'fam_code':
        case 'part_base_ref': {
            if (arg !== undefined) {
                throw new Error(`${ident} do not take argument`);
            }
            return {
                tok: Tok.Var,
                ident,
            };
        }
        case 'fam_count': {
            const width = parseInt(arg);
            if (isNaN(width)) {
                throw new Error(`"${ident}" takes a number argument for width. Got "${arg}".`);
            }
            if (width <= 0) {
                throw new Error(`"${ident}" width must be positive`);
            }
            return {
                tok: Tok.Var,
                ident,
                width,
            };
        }
        case 'part_version': {
            if (!arg) {
                throw new Error(`${ident} takes a format string argument`);
            }
            return {
                tok: Tok.Var,
                ident,
                format: new VersionFormat(arg),
            };
        }
    }
    /* istanbul ignore next */
    throw new Error(`unknown identifier: ${ident}`);
}

function parseLiteral(inp: CharIterator): LitToken {
    return {
        tok: Tok.Lit,
        value: inp.readUntil('${', { throws: false, including: false }),
    };
}

function parseRefNaming(inp: CharIterator, allowedVars: string[]): Token[] {
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

abstract class RefNaming {
    protected tokens: Token[];
    constructor(public readonly input: string, allowedVars: string[]) {
        this.tokens = parseRefNaming(new CharIterator(input), allowedVars);
    }
}

export interface AppRefNaming {
    partBase: PartBaseRefNaming;
    part: PartRefNaming;
}

export class PartBaseRefNaming extends RefNaming {
    constructor(public readonly input: string) {
        super(input, ['fam_code', 'fam_count']);
    }

    getBaseRef(fam: PartFamily): string {
        const parts = [];
        for (const tok of this.tokens) {
            if (tok.tok === Tok.Var) {
                switch (tok.ident) {
                    case 'fam_code':
                        parts.push(fam.code);
                        break;
                    case 'fam_count': {
                        const cs = fam.counter.toString();
                        if (cs.length > tok.width) {
                            throw new Error(
                                `Part family "${fam.name}" has reached the maximum number of references. ` +
                                    'Consider upgrading your reference system.'
                            );
                        }
                        parts.push(fam.counter.toString().padStart(tok.width, '0'));
                        break;
                    }
                }
            }
            if (tok.tok === Tok.Lit) {
                parts.push(tok.value);
            }
        }
        return parts.join('');
    }
}

export class PartRefNaming extends RefNaming {
    constructor(public readonly input: string) {
        super(input, ['part_base_ref', 'part_version']);
        let baseRef = 0;
        let version = 0;
        for (const tok of this.tokens) {
            if (tok.tok === Tok.Var) {
                switch (tok.ident) {
                    case 'part_base_ref':
                        baseRef++;
                        break;
                    case 'part_version':
                        version++;
                        break;
                }
            }
        }
        if (baseRef !== 1 || version !== 1) {
            throw new Error(
                'Part ref naming spec should contain one ${part_base_ref} and one ${part_version:format}'
            );
        }
    }

    getRef(base: PartBase, version: string): string {
        const parts = [];
        for (const tok of this.tokens) {
            if (tok.tok === Tok.Var) {
                switch (tok.ident) {
                    case 'part_base_ref':
                        parts.push(base.baseRef);
                        break;
                    case 'part_version': {
                        if (!tok.format.matches(version)) {
                            throw new Error(
                                `version "${version}" does not match specified version format: "${tok.format.input}"`
                            );
                        }
                        parts.push(version);
                        break;
                    }
                }
            }
            if (tok.tok === Tok.Lit) {
                parts.push(tok.value);
            }
        }
        return parts.join('');
    }

    getNext(base: PartBase, currentVersion: string): string {
        const parts = [];
        for (const tok of this.tokens) {
            if (tok.tok === Tok.Var) {
                switch (tok.ident) {
                    case 'part_base_ref':
                        parts.push(base.baseRef);
                        break;
                    case 'part_version': {
                        parts.push(tok.format.getNext(currentVersion));
                        break;
                    }
                }
            }
            if (tok.tok === Tok.Lit) {
                parts.push(tok.value);
            }
        }
        return parts.join('');
    }
}
