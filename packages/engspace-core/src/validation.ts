import Ajv from 'ajv';

const ajv = new Ajv();

export type CheckFunction<T extends object> = (obj: object) => obj is T;
export type ValidateFunction<T extends object> = (obj: object) => string[];
export type AssertFunction<T extends object> = (obj: object) => T;

export interface IEngspaceClass<T extends object> {
    check: CheckFunction<T>;
    validate: ValidateFunction<T>;
    assert: AssertFunction<T>;
}

export function createValidation<T extends object>(
    clas: IEngspaceClass<T>,
    schema: object,
    name: string
): void {
    const validate = ajv.compile(schema);

    clas.check = (obj: object): obj is T => {
        return validate(obj) as boolean;
    };

    clas.validate = (obj: object): string[] => {
        if (!validate(obj)) {
            return validate.errors.map(e => e.message);
        } else return [];
    };

    clas.assert = (obj: object): T => {
        if (validate(obj)) {
            return obj as T;
        }
        const errors = validate.errors
            ? `:\n - ${validate.errors.join('\n - ')}`
            : '';

        throw new TypeError(`Could not validate object as ${name}${errors}`);
    };
}
