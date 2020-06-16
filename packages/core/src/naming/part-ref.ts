import { VersionFormat } from '../version-format';
import { NamingBase, Kind, VarToken } from './base';
import { BadRefNamingFormatError, NamingCounterLimitError } from '.';

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

type PartRefToken = FamCodeToken | FamCountToken | PartVersionToken;

export class PartRefNaming extends NamingBase<PartRefComps, PartRefToken> {
    public versionFormat: VersionFormat;
    constructor(input: string) {
        super(
            input,
            {
                mapTok({ ident, arg }: VarToken): PartRefToken {
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
                                throw new BadRefNamingFormatError(
                                    `"${ident}" width must be positive`
                                );
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
                },
            },
            ['fam_code', 'fam_count', 'part_version'],
            ['fam_code', 'fam_count', 'part_version']
        );
    }

    protected compSeg(tok: PartRefToken, comps: PartRefComps): string {
        switch (tok.ident) {
            case 'fam_code':
                return comps.familyCode;
            case 'fam_count': {
                const cs = comps.familyCount.toString();
                if (cs.length > tok.width) {
                    throw new NamingCounterLimitError(
                        `Part family "${comps.familyCode}" has reached the maximum number of references. ` +
                            'Consider upgrading your reference system.'
                    );
                }
                return cs.padStart(tok.width, '0');
            }
            case 'part_version':
                if (!tok.format.matches(comps.partVersion)) {
                    throw new PartRefFormatMismatchError(
                        `version "${comps.partVersion}" does not match specified version format: "${tok.format.input}"`
                    );
                }
                return comps.partVersion;
        }
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
