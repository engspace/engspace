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

export interface Naming<Comps> {
    buildName(comps: Comps): string;
    extractComps(name: string): Comps;
}
