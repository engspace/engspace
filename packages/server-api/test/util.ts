import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { config } from '.';
import { bufferSha1sum, CharIterator, fileSha1sum } from '../src/util';

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

    describe('CharIterator', function() {
        it('gets next char until done', function() {
            const inp = new CharIterator('abc');
            expect(inp.done).to.be.false;
            expect(inp.next()).to.equal('a');
            expect(inp.done).to.be.false;
            expect(inp.next()).to.equal('b');
            expect(inp.done).to.be.false;
            expect(inp.next()).to.equal('c');
            expect(inp.done).to.be.true;
        });
        it('throws when getting char on done iterator', function() {
            const inp = new CharIterator('');
            expect(inp.done).to.be.true;
            function bad(): string {
                return inp.next();
            }
            expect(bad).to.throw();
        });
        it('peeks current char', function() {
            const inp = new CharIterator('abc');
            expect(inp.peek).to.equal('a');
            expect(inp.peek).to.equal('a');
            expect(inp.peek).to.equal('a');
            expect(inp.next()).to.equal('a');
            expect(inp.peek).to.equal('b');
            expect(inp.peek).to.equal('b');
        });
        it('throws if peeking done iterator', function() {
            const inp = new CharIterator('');
            function bad(): string {
                return inp.peek;
            }
            expect(bad).to.throw();
        });
        it('gives current char pos', function() {
            const inp = new CharIterator('abc');
            expect(inp.pos).to.equal(0);
            expect(inp.next()).to.equal('a');
            expect(inp.pos).to.equal(1);
            expect(inp.next()).to.equal('b');
            expect(inp.pos).to.equal(2);
            expect(inp.next()).to.equal('c');
            expect(inp.pos).to.equal(3);
        });
        it('looks ahead', function() {
            const inp = new CharIterator('abc');
            expect(inp.lookAhead(2)).to.equal('ab');
            expect(inp.pos).to.equal(0);
        });
        it('trims when looks ahead past the end', function() {
            const inp = new CharIterator('abc');
            inp.next();
            inp.next();
            expect(inp.lookAhead(2)).to.equal('c');
            expect(inp.pos).to.equal(2);
        });
        it('reads N characters', function() {
            const inp = new CharIterator('abc');
            expect(inp.read(2)).to.equal('ab');
            expect(inp.pos).to.equal(2);
        });
        it('trims when read N characters past the end', function() {
            const inp = new CharIterator('abc');
            inp.next();
            inp.next();
            expect(inp.read(2)).to.equal('c');
            expect(inp.done).to.be.true;
        });
        it('it reads until', function() {
            const inp = new CharIterator('abcdef');
            expect(inp.readUntil('e', { throws: false, including: false })).to.equal('abcd');
            expect(inp.pos).to.equal(4);
        });
        it('it reads until and include target', function() {
            const inp = new CharIterator('abcdef');
            expect(inp.readUntil('e', { throws: false, including: true })).to.equal('abcde');
            expect(inp.pos).to.equal(5);
        });
        it('it reads until end', function() {
            const inp = new CharIterator('abcdef');
            expect(inp.readUntil('z', { throws: false, including: false })).to.equal('abcdef');
            expect(inp.done).to.be.true;
        });
        it('it reads until and throws', function() {
            const inp = new CharIterator('abcdef');
            function bad(): string {
                return inp.readUntil('z', { throws: true, including: false });
            }
            expect(bad).to.throw();
            expect(inp.pos).to.equal(0);
        });
        it('can go backward', function() {
            const inp = new CharIterator('abc');
            expect(inp.read(2)).to.equal('ab');
            inp.back();
            expect(inp.peek).to.equal('b');
            inp.back();
            expect(inp.peek).to.equal('a');
        });
        it('throws if going backward before begin', function() {
            const inp = new CharIterator('abc');
            function bad(): void {
                inp.back();
            }
            expect(inp.read(1)).to.equal('a');
            inp.back();
            expect(inp.peek).to.equal('a');
            expect(bad).to.throw();
        });
    });
});
