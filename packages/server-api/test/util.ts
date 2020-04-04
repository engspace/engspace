import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { config } from '.';
import { bufferSha1sum, fileSha1sum } from '../src/util';

describe('Util', function() {
    describe('sha1 utility', function() {
        // using store path as temporary location
        const filepath = path.join(config.storePath, 'abcd.file');
        const content = 'abcd';
        const sha1 = '81fe8bfe87576c3ecb22426f8e57847382917acf';
        before('create file', async function() {
            await fs.promises.writeFile(filepath, content);
        });
        after('delete file', async function() {
            await fs.promises.unlink(filepath);
        });

        it('should compute sha1sum of a buffer', async function() {
            expect(bufferSha1sum(Buffer.from(content))).to.equal(sha1);
        });

        it('should compute sha1sum of a file', async function() {
            await expect(fileSha1sum(filepath)).to.eventually.equal(sha1);
        });
    });
});
