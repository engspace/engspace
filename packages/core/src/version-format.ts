import { replaceAt } from './util';

export function isVersionFormatSpec(spec: string): boolean {
    return /^[0-9A-Za-z]+$/.test(spec);
}

export class BadVersionFormatError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BadVersionFormatError';
        Error.captureStackTrace(this, BadVersionFormatError);
    }
}

export class MismatchVersionFormatError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MismatchVersionFormatError';
        Error.captureStackTrace(this, MismatchVersionFormatError);
    }
}

export enum Kind {
    Dig,
    Upp,
    Low,
}

interface Token {
    kind: Kind;
    char: string;
    firstChar: number;
    lastChar: number;
}

function getKind(c: string): Kind | null {
    if (/[0-9]/.test(c)) {
        return Kind.Dig;
    } else if (/[A-Z]/.test(c)) {
        return Kind.Upp;
    } else if (/[a-z]/.test(c)) {
        return Kind.Low;
    }
    return null;
}

function getInterval(kind: Kind): { firstChar: number; lastChar: number } {
    switch (kind) {
        case Kind.Dig:
            return { firstChar: '0'.charCodeAt(0), lastChar: '9'.charCodeAt(0) };
        case Kind.Upp:
            return { firstChar: 'A'.charCodeAt(0), lastChar: 'Z'.charCodeAt(0) };
        case Kind.Low:
            return { firstChar: 'a'.charCodeAt(0), lastChar: 'z'.charCodeAt(0) };
    }
}

function parseVersionFormat(input: string): Token[] {
    return [...input].map((c) => {
        const kind = getKind(c);
        return {
            kind,
            char: c,
            ...getInterval(kind),
        };
    });
}

export class VersionFormat {
    private toks: Token[];
    constructor(public readonly input: string) {
        if (!isVersionFormatSpec(input)) {
            throw new BadVersionFormatError(
                `"${input}" is not a correct version format specifier.` +
                    ' Version format must be specified with /[0-9A-Za-z]+/.'
            );
        }
        this.toks = parseVersionFormat(input);
    }

    public matches(version: string): boolean {
        if (version.length !== this.toks.length) {
            return false;
        }
        for (let i = 0; i < this.toks.length; ++i) {
            if (this.toks[i].kind !== getKind(version.charAt(i))) {
                return false;
            }
        }
        return true;
    }

    public getNext(version: string): string {
        if (!this.matches(version)) {
            throw new MismatchVersionFormatError(
                `Version "${version}" does not match input specification: "${this.input}"`
            );
        }

        let res = version;

        let i = version.length;
        let bumpNext = true;
        while (i-- && bumpNext) {
            const tok = this.toks[i];
            let c = version.charCodeAt(i);
            if (c === tok.lastChar) {
                c = tok.firstChar;
            } else {
                c++;
                bumpNext = false;
            }
            res = replaceAt(res, i, String.fromCharCode(c));
        }

        return res;
    }
}
