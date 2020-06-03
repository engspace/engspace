import crypto from 'crypto';
import fs from 'fs';

export async function fileSha1sum(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const rs = fs.createReadStream(filepath);
        const hasher = crypto.createHash('sha1');
        rs.on('data', function (data) {
            hasher.update(data);
        });
        rs.on('end', function () {
            return resolve(hasher.digest('hex'));
        });
        /* istanbul ignore next */
        rs.on('error', function (err) {
            reject(err);
        });
    });
}

export function bufferSha1sum(content: Buffer): string {
    const hasher = crypto.createHash('sha1');
    hasher.update(content);
    return hasher.digest('hex');
}
