import crypto from 'crypto';
import fs from 'fs';

export async function fileSha1sum(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const rs = fs.createReadStream(filepath);
        const hasher = crypto.createHash('sha1');
        rs.on('data', function(data) {
            hasher.update(data);
        });
        rs.on('end', function() {
            return resolve(hasher.digest('hex'));
        });
        /* istanbul ignore next */
        rs.on('error', function(err) {
            reject(err);
        });
    });
}

export function bufferSha1sum(content: Buffer): string {
    const hasher = crypto.createHash('sha1');
    hasher.update(content);
    return hasher.digest('hex');
}

export class CharIterator {
    private _pos = 0;
    constructor(public readonly input: string) {}

    get peek(): string {
        if (this.done) {
            throw new Error('cannot peek on done interator');
        }
        return this.input[this._pos];
    }

    get done(): boolean {
        return this._pos >= this.input.length;
    }

    get pos(): number {
        return this._pos;
    }

    next(): string {
        if (this.done) {
            throw new Error('cannot call next on done iterator');
        }
        const c = this.input[this._pos];
        this._pos++;
        return c;
    }

    back(): void {
        if (this._pos <= 0) {
            throw new Error('cannot go back');
        }
        this._pos--;
    }

    lookAhead(n: number): string {
        if (n > this.input.length - this._pos) {
            n = this.input.length - this._pos;
        }
        return this.input.slice(this._pos, this._pos + n);
    }

    read(n: number): string {
        if (n > this.input.length - this._pos) {
            n = this.input.length - this._pos;
        }
        const r = this.input.slice(this._pos, this._pos + n);
        this._pos += n;
        return r;
    }

    readUntil(s: string, { throws, including } = { throws: true, including: true }): string {
        const ind = this.input.indexOf(s, this._pos);
        const start = this._pos;
        if (ind === -1 && throws) {
            throw new Error(`"${s}" not found in ${this.input.slice(start)}`);
        } else if (ind === -1) {
            this._pos = this.input.length;
            return this.input.slice(start);
        }
        this._pos = including ? ind + s.length : ind;
        return this.input.slice(start, this._pos);
    }
}

export function replaceAt(input: string, index: number, repl: string): string {
    return input.substring(0, index) + repl + input.substring(index + repl.length);
}
