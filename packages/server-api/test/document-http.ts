import { Document, DocumentRevision, DocumentRevisionInput, User } from '@engspace/core';
import { prepareUsers } from '@engspace/demo-data-input';
import { Db, documentDao, documentRevisionDao, userDao } from '@engspace/server-db';
import { expect, request } from 'chai';
import config from 'config';
import fs from 'fs';
import path from 'path';
import { api, pool, storePath } from '.';
import { bufferSha1sum } from '../src/util';
import { bearerToken, permsAuth } from './auth';
import { createDoc } from './document';
import { createDocRev } from './document-revision';
import { createUsers } from './user';

async function createDocRevWithContent(
    db: Db,
    document: Document,
    user: User,
    input: Partial<DocumentRevisionInput>,
    content: Buffer
): Promise<DocumentRevision> {
    const rev = await createDocRev(db, document, user, {
        ...input,
        filesize: content.length,
    });

    const sum = bufferSha1sum(content);
    await fs.promises.writeFile(path.join(storePath, sum), content);
    await documentRevisionDao.updateAddProgress(db, rev.id, content.length);
    return documentRevisionDao.updateSha1(db, rev.id, sum);
}

function binaryParser(res, cb): void {
    res.setEncoding('binary');
    res.data = [];
    res.on('data', function(chunk) {
        res.data.push(chunk);
    });
    res.on('end', function() {
        cb(null, Buffer.from(res.data.join(), 'binary'));
    });
}

describe('HTTP Document', function() {
    let users;
    let server;

    before('Create users', async () => {
        return pool.transaction(async db => {
            users = await createUsers(db, prepareUsers());
        });
    });
    before('Start server', done => {
        const { port } = config.get('server');
        server = api.koa.listen(port, done);
    });

    after('Delete users and document', async function() {
        await pool.transaction(async db => {
            await userDao.deleteAll(db);
        });
    });

    describe('Download', function() {
        const fileContent = Buffer.from('abcd'.repeat(100), 'binary');
        let document;
        let revision;
        before('create doc, revision and file', async function() {
            await pool.transaction(async db => {
                document = await createDoc(db, users.tania, {
                    name: 'abcd',
                    description: 'doc ABCD',
                    initialCheckout: true,
                });
                revision = await createDocRevWithContent(
                    db,
                    document,
                    users.tania,
                    {
                        filename: 'abcd.ext',
                        changeDescription: 'create',
                        retainCheckout: false,
                    },
                    fileContent
                );
            });
        });
        after('delete doc, revision and file', async function() {
            await pool.transaction(async db => {
                await fs.promises.unlink(path.join(storePath, revision.sha1));
                await documentRevisionDao.deleteAll(db);
                await documentDao.deleteAll(db);
            });
        });

        it('should get a token and download a document revision with "document.read"', async function() {
            const token = await bearerToken(permsAuth(users.philippe, ['document.read']));
            const resp = await request(server)
                .get('/api/document/download_token')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    documentId: document.id,
                    revision: revision.revision,
                });
            expect(resp).to.have.status(200);
            expect(resp).to.be.json;
            expect(resp.body.downloadToken).to.be.a('string');

            const downloadTok = resp.body.downloadToken;
            const resp2 = await request(server)
                .get('/api/document/download')
                .query({
                    token: downloadTok,
                })
                .buffer()
                .parse(binaryParser);
            expect(resp2).to.have.status(200);
            expect(resp2).to.have.header('content-length', fileContent.length.toString());
            expect(resp2).to.have.header('content-disposition', 'attachment; filename=abcd.ext');
            expect(resp2.body).to.be.instanceOf(Buffer);
            expect(resp2.body.equals(fileContent)).to.be.true;
        });

        it('should not get a download token without "document.read"', async function() {
            const token = await bearerToken(permsAuth(users.philippe, []));
            const resp = await request(server)
                .get('/api/document/download_token')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    documentId: document.id,
                    revision: revision.revision,
                });
            expect(resp).to.have.status(403);
            expect(resp).to.be.text;
            expect(resp.text).to.contain('document.read');
        });

        it('should not get a download token without auth', async function() {
            const resp = await request(server)
                .get('/api/document/download_token')
                .query({
                    documentId: document.id,
                    revision: revision.revision,
                });
            expect(resp).to.have.status(401);
        });

        it('should get 400 with ill-formed document id', async function() {
            const token = await bearerToken(permsAuth(users.philippe, ['document.read']));
            const resp = await request(server)
                .get('/api/document/download_token')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    documentId: 'not-uuid',
                    revision: 1,
                });
            expect(resp).to.have.status(400);
        });

        it('should get 400 with ill-formed revision', async function() {
            const token = await bearerToken(permsAuth(users.philippe, ['document.read']));
            const resp = await request(server)
                .get('/api/document/download_token')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    documentId: document.id,
                    revision: 'not-integer',
                });
            expect(resp).to.have.status(400);
        });

        it('should get 404 with wrong document', async function() {
            const token = await bearerToken(permsAuth(users.philippe, ['document.read']));
            const resp = await request(server)
                .get('/api/document/download_token')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    documentId: users.philippe.id,
                    revision: 1,
                });
            expect(resp).to.have.status(404);
        });

        it('should get 404 with wrong revision', async function() {
            const token = await bearerToken(permsAuth(users.philippe, ['document.read']));
            const resp = await request(server)
                .get('/api/document/download_token')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    documentId: document.id,
                    revision: 32,
                });
            expect(resp).to.have.status(404);
        });

        it('should not get 404 with wrong document and wrong perms', async function() {
            const token = await bearerToken(permsAuth(users.philippe, []));
            const resp = await request(server)
                .get('/api/document/download_token')
                .set('Authorization', `Bearer ${token}`)
                .query({
                    documentId: 'not-uuid',
                    revision: 1,
                });
            expect(resp).to.have.status(403);
            expect(resp).to.be.text;
            expect(resp.text).to.contain('document.read');
        });
    });
});
