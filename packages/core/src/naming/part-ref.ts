import { VersionFormat } from '../version-format';
import { CharIterator } from '../util';
import { parseNaming, Kind, BadRefNamingFormatError, LitToken, Naming } from '.';

export class FamilyCounterLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FamilyCounterLimitError';
        Error.captureStackTrace(this, FamilyCounterLimitError);
    }
}

export class PartRefFormatMismatchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PartRefFormatMismatchError';
        Error.captureStackTrace(this, PartRefFormatMismatchError);
    }
}

export interface PartRefComps {
    familyCode: string;
    familyCount: number;
    partVersion: string;
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

type PartRefToken = LitToken | FamCodeToken | FamCountToken | PartVersionToken;

export class PartRefNaming implements Naming<PartRefComps> {
    private tokens: readonly PartRefToken[];
    versionFormat: VersionFormat;

    constructor(public readonly input: string) {
        const tokens = parseNaming(new CharIterator(input), [
            'fam_code',
            'fam_count',
            'part_version',
        ]);
        let famCode = 0;
        let famCount = 0;
        this.tokens = tokens.map((tok) => {
            if (tok.kind === Kind.Lit) return tok;
            const { ident, arg } = tok;
            switch (ident) {
                case 'fam_code': {
                    famCode++;
                    if (arg !== undefined) {
                        throw new BadRefNamingFormatError(`${ident} do not take argument`);
                    }
                    return {
                        kind: Kind.Var,
                        ident,
                    };
                }
                case 'fam_count': {
                    famCount++;
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
                        throw new BadRefNamingFormatError(
                            `${ident} takes a format string argument`
                        );
                    }
                    this.versionFormat = new VersionFormat(arg);
                    return {
                        kind: Kind.Var,
                        ident,
                        format: this.versionFormat,
                    };
                }
            }
        });
        if (famCode === 0) {
            throw new BadRefNamingFormatError('Missing variable: "fam_code"');
        }
        if (famCount === 0) {
            throw new BadRefNamingFormatError('Missing variable: "fam_count"');
        }
        if (!this.versionFormat) {
            throw new BadRefNamingFormatError('Missing variable: "part_version"');
        }
    }

    buildName({ familyCode, familyCount, partVersion }: PartRefComps): string {
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
                                throw new PartRefFormatMismatchError(
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

    extractComps(ref: string): PartRefComps {
        // part family code is the only one whose length is unknown,
        // so we have to loop tokens forward and then backward until we hit fam_code
        let familyCount: number;
        let partVersion: string;
        let r = ref;

        forward: for (const tok of this.tokens) {
            switch (tok.kind) {
                case Kind.Lit:
                    if (!r.startsWith(tok.value)) {
                        throw new PartRefFormatMismatchError(
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
                                throw new PartRefFormatMismatchError(
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
                                throw new PartRefFormatMismatchError(
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
                        throw new PartRefFormatMismatchError(
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
                                throw new PartRefFormatMismatchError(
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
                                throw new PartRefFormatMismatchError(
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
            throw new PartRefFormatMismatchError(`"${ref}" do not contain any family code`);
        }

        return {
            familyCode,
            familyCount,
            partVersion,
        };
    }
}
