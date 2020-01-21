declare module 'js-sha1' {
    function sha1(message: sha1.Message): string;

    namespace sha1 {
        type Message = string | Array<number> | Uint8Array | ArrayBuffer;

        interface Sha1 {
            update(input: Message): string;

            hex(): string;
            array(): Uint8Array;
            digest(): Uint8Array;
            arrayBuffer(): ArrayBuffer;
        }

        export function hex(message: Message): string;
        export function array(message: Message): Uint8Array;
        export function digest(message: Message): Uint8Array;
        export function arrayBuffer(message: Message): ArrayBuffer;

        export function create(): Sha1;
        export function update(message: Message): Sha1;
    }

    export = sha1;
}
