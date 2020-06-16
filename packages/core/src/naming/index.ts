export { PartRefComps, PartRefFormatMismatchError, PartRefNaming } from './part-ref';
export { ChangeComps, ChangeNaming } from './change';

export class BadRefNamingFormatError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BadRefNamingFormatError';
        Error.captureStackTrace(this, BadRefNamingFormatError);
    }
}

export class NamingCounterLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NamingCounterLimitError';
        Error.captureStackTrace(this, NamingCounterLimitError);
    }
}

export interface Naming<Comps> {
    buildName(comps: Comps): string;
}
