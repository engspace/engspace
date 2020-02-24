import { prepareUsers } from '@engspace/demo-data-input';
import { expect } from 'chai';
import { pool } from '.';
import { documentRevisionDao, userDao, documentDao, Db } from '../src';
import { createUsers } from './user';
import {
    DocumentRevision,
    Document,
    User,
    DocumentRevisionInput,
    DocumentInput,
} from '@engspace/core';

async function createDoc(
    db: Db,
    user: User,
    input: Partial<DocumentInput> = {}
): Promise<Document> {
    return documentDao.create(
        db,
        {
            name: 'docname',
            description: 'doc description',
            initialCheckout: true,
            ...input,
        },
        user.id
    );
}

async function createRev(
    db: Db,
    doc: Document,
    user: User,
    input: Partial<DocumentRevisionInput> = {}
): Promise<DocumentRevision> {
    return documentRevisionDao.create(
        db,
        {
            documentId: doc.id,
            filename: 'file.ext',
            filesize: 1664,
            changeDescription: 'update file',
            retainCheckout: true,
            ...input,
        },
        user.id
    );
}

describe('documentRevisionDao', function() {
    let users;

    before('create users', async function() {
        users = await pool.transaction(async db => {
            return createUsers(db, prepareUsers());
        });
    });

    after('delete users', async function() {
        return pool.transaction(async db => {
            return userDao.deleteAll(db);
        });
    });

    describe('Create', function() {
        it('should create first revision and release checkout', async function() {
            const { doc, rev } = await pool.transaction(async db => {
                const doc = await createDoc(db, users.tania, { initialCheckout: true });
                const rev = await createRev(db, doc, users.tania, { retainCheckout: false });
                return { doc: await documentDao.byId(db, doc.id), rev };
            });
            expect(rev.id).to.be.uuid();
            expect(rev.createdAt).to.be.a('number');
            expect(rev).to.deep.include({
                document: { id: doc.id },
                revision: 1,
                filename: 'file.ext',
                filesize: 1664,
                createdBy: { id: users.tania.id },
                changeDescription: 'update file',
                uploaded: 0,
                sha1: null,
            });
            expect(doc).to.deep.include({
                checkout: null,
            });
        });

        it('should retain checkout', async function() {
            const { doc, rev1 } = await pool.transaction(async db => {
                const doc = await createDoc(db, users.tania);
                const rev1 = await createRev(db, doc, users.tania, { retainCheckout: true });
                return { doc: await documentDao.byId(db, doc.id), rev1 };
            });
            expect(rev1.id).to.be.uuid();
            expect(rev1.createdAt).to.be.a('number');
            expect(rev1).to.deep.include({
                document: { id: doc.id },
                revision: 1,
            });
            expect(doc).to.deep.include({
                checkout: { id: users.tania.id },
            });
        });
    });

    describe('Read', function() {
        let document;
        let revision1;
        let revision2;

        before('create doc and revisions', async function() {
            await pool.transaction(async db => {
                document = await createDoc(db, users.tania, { initialCheckout: true });
                revision1 = await createRev(db, document, users.tania, {
                    filesize: 1665,
                    filename: 'file.ext',
                    changeDescription: 'creation',
                    retainCheckout: true,
                });
                revision2 = await createRev(db, document, users.tania, {
                    filesize: 16710,
                    filename: 'filev2.ext',
                    changeDescription: 'update',
                    retainCheckout: false,
                });
            });
        });

        after('delete document and revs', async function() {
            await pool.transaction(async db => {
                await documentRevisionDao.deleteAll(db);
                await documentDao.deleteAll(db);
            });
        });

        it('should read all revisions', async function() {
            const revs = await pool.connect(async db => {
                return documentRevisionDao.byDocumentId(db, document.id);
            });
            expect(revs).to.eql([revision1, revision2]);
        });

        it('should read last revision', async function() {
            const rev2 = await pool.connect(async db => {
                return documentRevisionDao.lastByDocumentId(db, document.id);
            });
            expect(rev2).to.eql(revision2);
        });

        it('should read by revision number and document id', async function() {
            const rev2 = await pool.connect(async db => {
                return documentRevisionDao.byDocumentIdAndRev(db, document.id, 2);
            });
            expect(rev2).to.eql(revision2);
        });
    });

    describe('Update', function() {
        afterEach('delete document and revs', async function() {
            await pool.transaction(async db => {
                await documentRevisionDao.deleteAll(db);
                await documentDao.deleteAll(db);
            });
        });

        it('should revise document', async function() {
            const { doc, rev1, rev2 } = await pool.transaction(async db => {
                const doc = await createDoc(db, users.tania);
                const rev1 = await createRev(db, doc, users.tania, { retainCheckout: true });
                const rev2 = await createRev(db, doc, users.tania, {
                    filesize: 23020,
                    filename: 'file_v2.ext',
                    changeDescription: 'update v2',
                    retainCheckout: false,
                });
                return { doc: await documentDao.byId(db, doc.id), rev1, rev2 };
            });
            expect(rev2.id).to.be.uuid();
            expect(rev2.id).to.not.eql(rev1.id);
            expect(rev2.createdAt).to.be.a('number');
            expect(rev2).to.deep.include({
                document: { id: doc.id },
                revision: 2,
                filesize: 23020,
                filename: 'file_v2.ext',
                createdBy: { id: users.tania.id },
                changeDescription: 'update v2',
            });
            expect(doc).to.deep.include({
                checkout: null,
            });
        });

        it('should update progress', async function() {
            const { rev0, upld10k, rev10k, upld25k, rev25k } = await pool.transaction(async db => {
                const doc = await createDoc(db, users.tania);
                const rev0 = await createRev(db, doc, users.tania, {
                    filesize: 25000,
                    retainCheckout: true,
                });
                const upld10k = await documentRevisionDao.updateAddProgress(db, rev0.id, 10000);
                const rev10k = await documentRevisionDao.byId(db, rev0.id);
                const upld25k = await documentRevisionDao.updateAddProgress(db, rev0.id, 15000);
                const rev25k = await documentRevisionDao.byId(db, rev0.id);
                return { rev0, upld10k, rev10k, upld25k, rev25k };
            });

            expect(rev0).to.deep.include({
                uploaded: 0,
            });
            expect(upld10k).to.equal(10000);
            expect(rev10k).to.deep.include({
                uploaded: 10000,
            });
            expect(upld25k).to.equal(25000);
            expect(rev25k).to.deep.include({
                uploaded: 25000,
            });
        });

        it('should not allow progress above filesize', async function() {
            const tooHighUpload = pool.transaction(async db => {
                const doc = await createDoc(db, users.tania);
                const rev0 = await createRev(db, doc, users.tania, {
                    filesize: 25000,
                    retainCheckout: true,
                });
                return documentRevisionDao.updateAddProgress(db, rev0.id, 25001);
            });
            // implemented with PostgreSQL CHECK
            await expect(tooHighUpload).to.be.rejectedWith('check');
        });

        it('should update sha1', async function() {
            const rev = await pool.transaction(async db => {
                const doc = await createDoc(db, users.tania);
                const rev0 = await createRev(db, doc, users.tania, {
                    filesize: 25000,
                    retainCheckout: true,
                });
                await documentRevisionDao.updateAddProgress(db, rev0.id, 25000);
                return documentRevisionDao.updateSha1(db, rev0.id, 'af'.repeat(10));
            });
            expect(rev).to.deep.include({
                uploaded: 25000,
                sha1: 'af'.repeat(10),
            });
        });
    });
});
