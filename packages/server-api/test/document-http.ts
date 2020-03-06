import { Document, DocumentRevision, DocumentRevisionInput, User } from '@engspace/core';
import { Db, documentDao, documentRevisionDao } from '@engspace/server-db';
import { expect, request } from 'chai';
import config from 'config';
import fs from 'fs';
import gql from 'graphql-tag';
import path from 'path';
import { api, buildGqlServer, pool, storePath } from '.';
import { bufferSha1sum } from '../src/util';
import { bearerToken, permsAuth } from './auth';
import { cleanTable, createDoc, createDocRev, transacDemoUsers } from './helpers';

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

const DOCREV_CHECK = gql`
    mutation DocRevCheck($id: ID!, $sha1: String!) {
        documentRevisionCheck(id: $id, sha1: $sha1) {
            sha1
        }
    }
`;

describe('HTTP /api/document', function() {
    let users;

    before('Create users', async () => {
        users = await transacDemoUsers();
    });

    after('Delete users', cleanTable('user'));

    let server;

    before('Start server', done => {
        const { port } = config.get('server');
        server = api.koa.listen(port, done);
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

    describe('Upload', function() {
        const fileContent = Buffer.from('abcd'.repeat(100), 'binary');
        const sha1 = bufferSha1sum(fileContent);
        let document;
        before('create doc', async function() {
            await pool.transaction(async db => {
                document = await createDoc(db, users.tania, {
                    name: 'abcd',
                    description: 'doc ABCD',
                    initialCheckout: true,
                });
            });
        });
        after('delete doc', async function() {
            await pool.transaction(async db => {
                await documentDao.deleteAll(db);
            });
        });
        afterEach('delete revisions', async function() {
            await pool.transaction(async db => {
                await documentRevisionDao.deleteAll(db);
            });
        });

        it('should perform full upload process', async function() {
            const auth = permsAuth(users.philippe, ['document.revise']);
            const rev = await pool.transaction(async db => {
                return createDocRev(db, document, users.philippe, {
                    filename: 'abcd.ext',
                    filesize: fileContent.length,
                    retainCheckout: false,
                });
            });
            const token = await bearerToken(auth);
            const resp = await request(server)
                .post('/api/document/upload')
                .set({
                    authorization: `Bearer ${token}`,
                    'content-length': fileContent.length,
                    'x-upload-offset': 0,
                    'x-upload-length': fileContent.length,
                })
                .query({
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    rev_id: rev.id,
                })
                .send(fileContent);
            expect(resp).to.have.status(200);
            expect(fs.existsSync(path.join(storePath, 'upload', rev.id)), 'temp upload file exists')
                .to.be.true;
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(db, auth);
                return mutate({
                    mutation: DOCREV_CHECK,
                    variables: {
                        id: rev.id,
                        sha1,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.documentRevisionCheck).to.deep.include({
                sha1,
            });
            expect(fs.existsSync(path.join(storePath, 'upload', rev.id)), 'temp upload file exists')
                .to.be.false;
            expect(fs.existsSync(path.join(storePath, sha1)), 'final upload file exists').to.be
                .true;
            await fs.promises.unlink(path.join(storePath, sha1));
        });

        it('should error if sha1 is false', async function() {
            const auth = permsAuth(users.philippe, ['document.revise']);
            const rev = await pool.transaction(async db => {
                return createDocRev(db, document, users.philippe, {
                    filename: 'abcd.ext',
                    filesize: fileContent.length,
                    retainCheckout: false,
                });
            });
            const token = await bearerToken(auth);
            const resp = await request(server)
                .post('/api/document/upload')
                .set({
                    authorization: `Bearer ${token}`,
                    'content-length': fileContent.length,
                    'x-upload-offset': 0,
                    'x-upload-length': fileContent.length,
                })
                .query({
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    rev_id: rev.id,
                })
                .send(fileContent);
            expect(resp).to.have.status(200);
            expect(fs.existsSync(path.join(storePath, 'upload', rev.id)), 'temp upload file exists')
                .to.be.true;
            const { errors, data } = await pool.transaction(async db => {
                const { mutate } = buildGqlServer(db, auth);
                return mutate({
                    mutation: DOCREV_CHECK,
                    variables: {
                        id: rev.id,
                        sha1: 'wrongsha1',
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(errors[0].message).to.contain('wrongsha1');
            expect(data).to.be.null;
            expect(fs.existsSync(path.join(storePath, 'upload', rev.id)), 'temp upload file exists')
                .to.be.false;
            expect(fs.existsSync(path.join(storePath, sha1)), 'final upload file exists').to.be
                .false;
            const r = await pool.connect(async db => {
                return documentRevisionDao.byId(db, rev.id);
            });
            expect(r, 'revision has been cleaned-up').to.be.null;
        });

        it('should return 404 if revision does not exist', async function() {
            const auth = permsAuth(users.philippe, ['document.revise']);
            const token = await bearerToken(auth);
            const resp = await request(server)
                .post('/api/document/upload')
                .set({
                    authorization: `Bearer ${token}`,
                    'content-length': fileContent.length,
                    'x-upload-offset': 0,
                    'x-upload-length': fileContent.length,
                })
                .query({
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    rev_id: users.philippe.id,
                })
                .send(fileContent);
            expect(resp).to.have.status(404);
        });

        it('should return 403 without "document.revise"', async function() {
            const rev = await pool.transaction(async db => {
                return createDocRev(db, document, users.philippe, {
                    filename: 'abcd.ext',
                    filesize: fileContent.length,
                    retainCheckout: false,
                });
            });
            const auth = permsAuth(users.philippe, []);
            const token = await bearerToken(auth);
            const resp = await request(server)
                .post('/api/document/upload')
                .set({
                    authorization: `Bearer ${token}`,
                    'content-length': fileContent.length,
                    'x-upload-offset': 0,
                    'x-upload-length': fileContent.length,
                })
                .query({
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    rev_id: rev.id,
                })
                .send(fileContent);
            expect(resp).to.have.status(403);
        });

        it('should return 401 without authorization', async function() {
            const rev = await pool.transaction(async db => {
                return createDocRev(db, document, users.philippe, {
                    filename: 'abcd.ext',
                    filesize: fileContent.length,
                    retainCheckout: false,
                });
            });
            const resp = await request(server)
                .post('/api/document/upload')
                .set({
                    'content-length': fileContent.length,
                    'x-upload-offset': 0,
                    'x-upload-length': fileContent.length,
                })
                .query({
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    rev_id: rev.id,
                })
                .send(fileContent);
            expect(resp).to.have.status(401);
        });

        it('should return 400 if ill-formed query', async function() {
            const rev = await pool.transaction(async db => {
                return createDocRev(db, document, users.philippe, {
                    filename: 'abcd.ext',
                    filesize: fileContent.length,
                    retainCheckout: false,
                });
            });
            const auth = permsAuth(users.philippe, ['document.revise']);
            const token = await bearerToken(auth);
            const resp = await request(server)
                .post('/api/document/upload')
                .set({
                    authorization: `Bearer ${token}`,
                    'content-length': fileContent.length,
                    'x-upload-offset': 0,
                    'x-upload-length': fileContent.length,
                })
                .query({
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    revisionId: rev.id,
                })
                .send(fileContent);
            expect(resp).to.have.status(400);
        });
    });
});
