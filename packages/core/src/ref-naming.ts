import { CharIterator } from './util';
import { VersionFormat } from './version-format';

export class BadRefNamingFormatError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BadRefNamingFormatError';
        Error.captureStackTrace(this, BadRefNamingFormatError);
    }
}

export class RefNameFormatMismatchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RefNameFormatMismatchError';
        Error.captureStackTrace(this, RefNameFormatMismatchError);
    }
}

export class FamilyCounterLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FamilyCounterLimitError';
        Error.captureStackTrace(this, FamilyCounterLimitError);
    }
}

enum Kind {
    Lit,
    Var,
}

interface LitToken {
    kind: Kind.Lit;
    value: string;
}

interface FamCodeToken {
    kind: Kind.Var;
    ident: 'fam_code';
}

interface FamCountToken {
    kind: Kind.Var;
    ident: 'fam_count';
    width: number;
}

interface PartVersionToken {
    kind: Kind.Var;
    ident: 'part_version';
    format: VersionFormat;
}

type VarToken = FamCodeToken | FamCountToken | PartVersionToken;

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
        throw new BadRefNamingFormatError(`unknown variable "${ident}"`);
    }

    switch (ident) {
        case 'fam_code': {
            if (arg !== undefined) {
                throw new BadRefNamingFormatError(`${ident} do not take argument`);
            }
            return {
                kind: Kind.Var,
                ident,
            };
        }
        case 'fam_count': {
            const width = parseInt(arg);
            if (isNaN(width)) {
                throw new BadRefNamingFormatError(
                    `"${ident}" takes a number argument for width. Got "${arg}".`
                );
            }
            if (width <= 0) {
                throw new BadRefNamingFormatError(`"${ident}" width must be positive`);
            }
            return {
                kind: Kind.Var,
                ident,
                width,
            };
        }
        case 'part_version': {
            if (!arg) {
                throw new BadRefNamingFormatError(`${ident} takes a format string argument`);
            }
            return {
                kind: Kind.Var,
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
        kind: Kind.Lit,
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

export interface PartRefParts {
    familyCode: string;
    familyCount: number;
    partVersion: string;
}

export class PartRefNaming {
    private tokens: readonly Token[];
    versionFormat: VersionFormat;

    constructor(public readonly input: string) {
        this.tokens = parseRefNaming(new CharIterator(input), [
            'fam_code',
            'fam_count',
            'part_version',
        ]);
        if (this.tokens.filter((t) => t.kind === Kind.Var && t.ident === 'fam_code').length !== 1) {
            throw new BadRefNamingFormatError('Missing variable: "fam_code"');
        }
        if (
            this.tokens.filter((t) => t.kind === Kind.Var && t.ident === 'fam_count').length !== 1
        ) {
            throw new BadRefNamingFormatError('Missing variable: "fam_count"');
        }
        const partVersionToks = this.tokens.filter(
            (t) => t.kind === Kind.Var && t.ident === 'part_version'
        ) as PartVersionToken[];
        if (partVersionToks.length !== 1) {
            throw new BadRefNamingFormatError('Missing variable: "part_version"');
        }
        this.versionFormat = partVersionToks[0].format;
    }

    buildRef({ familyCode, familyCount, partVersion }: PartRefParts): string {
        const segs = [];
        for (const tok of this.tokens) {
            switch (tok.kind) {
                case Kind.Lit: {
                    segs.push(tok.value);
                    break;
                }
                case Kind.Var: {
                    switch (tok.ident) {
                        case 'fam_code':
                            segs.push(familyCode);
                            break;
                        case 'fam_count': {
                            const cs = familyCount.toString();
                            if (cs.length > tok.width) {
                                throw new FamilyCounterLimitError(
                                    `Part family "${familyCode}" has reached the maximum number of references. ` +
                                        'Consider upgrading your reference system.'
                                );
                            }
                            segs.push(cs.padStart(tok.width, '0'));
                            break;
                        }
                        case 'part_version':
                            if (!tok.format.matches(partVersion)) {
                                throw new RefNameFormatMismatchError(
                                    `version "${partVersion}" does not match specified version format: "${tok.format.input}"`
                                );
                            }
                            segs.push(partVersion);
                            break;
                    }
                }
            }
        }
        return segs.join('');
    }

    extractParts(ref: string): PartRefParts {
        // part family code is the only one whose length is unknown,
        // so we have to loop tokens forward and then backward until we hit fam_code
        let familyCount: number;
        let partVersion: string;
        let r = ref;

        forward: for (const tok of this.tokens) {
            switch (tok.kind) {
                case Kind.Lit:
                    if (!r.startsWith(tok.value)) {
                        throw new RefNameFormatMismatchError(
                            `"${ref}" does not match expected literal`
                        );
                    }
                    r = r.substr(tok.value.length);
                    break;
                case Kind.Var:
                    switch (tok.ident) {
                        case 'fam_code': {
                            break forward;
                        }
                        case 'fam_count': {
                            const fc = r.substr(0, tok.width);
                            if (fc.length != tok.width || !/^[0-9]+$/.test(fc)) {
                                throw new RefNameFormatMismatchError(
                                    `"${fc}" does not match expected family count ref-naming`
                                );
                            }
                            r = r.substr(tok.width);
                            familyCount = parseInt(fc);
                            break;
                        }
                        case 'part_version':
                            partVersion = r.substr(0, tok.format.input.length);
                            if (!tok.format.matches(partVersion)) {
                                throw new RefNameFormatMismatchError(
                                    `"${partVersion}" do not match expected version format`
                                );
                            }
                            r = r.substr(partVersion.length);
                            break;
                    }
            }
        }

        backward: for (let i = this.tokens.length - 1; i >= 0; --i) {
            const tok = this.tokens[i];
            switch (tok.kind) {
                case Kind.Lit:
                    if (!r.endsWith(tok.value)) {
                        throw new RefNameFormatMismatchError(
                            `"${ref}" does not match expected literal`
                        );
                    }
                    r = r.substr(0, r.length - tok.value.length);
                    break;
                case Kind.Var:
                    switch (tok.ident) {
                        case 'fam_code': {
                            break backward;
                        }
                        case 'fam_count': {
                            const fc = r.substr(r.length - tok.width);
                            if (fc.length != tok.width || !/^[0-9]+$/.test(fc)) {
                                throw new RefNameFormatMismatchError(
                                    `"${fc}" does not match expected family count ref-naming`
                                );
                            }
                            r = r.substr(0, r.length - tok.width);
                            familyCount = parseInt(fc);
                            break;
                        }
                        case 'part_version':
                            partVersion = r.substr(r.length - tok.format.input.length);
                            if (!tok.format.matches(partVersion)) {
                                throw new RefNameFormatMismatchError(
                                    `"${partVersion}" do not match expected version format`
                                );
                            }
                            r = r.substr(0, r.length - partVersion.length);
                            break;
                    }
            }
        }

        const familyCode = r;
        if (!familyCode.length) {
            throw new RefNameFormatMismatchError(`"${ref}" do not contain any family code`);
        }

        return {
            familyCode,
            familyCount,
            partVersion,
        };
    }
}
