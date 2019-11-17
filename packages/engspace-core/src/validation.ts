import Ajv from 'ajv';

const ajv = new Ajv();

export type ValidateFunction<T> = (obj: object) => T;

export function createValidation<T extends object>(
    schema: object,
    name: string
): ValidateFunction<T> {
    const validate = ajv.compile(schema);
    return (obj: object): T => {
        if (validate(obj)) {
            return obj as T;
        }
        const errors = validate.errors
            ? `:\n - ${validate.errors.join('\n - ')}`
            : '';

        throw new TypeError(`Could not validate object as ${name}${errors}`);
    };
}
