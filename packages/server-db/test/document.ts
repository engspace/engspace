import { Document, DocumentInput } from '@engspace/core';
import { DemoDocInput, DemoUserSet, documentInput } from '@engspace/demo-data-input';
import { expect } from 'chai';
import { pool } from '.';
import { Db, documentDao } from '../src';
import { cleanTable, transacDemoUsers } from '../src/test-helpers';

async function createDocument(
    db: Db,
    { name, description, creator }: DemoDocInput,
    users: Promise<DemoUserSet>,
    initialCheckout: boolean
): Promise<Document> {
    const docInput: DocumentInput = {
        name,
        description,
        initialCheckout,
    };
    const usrs = await users;
    return documentDao.create(db, docInput, usrs[creator].id);
}

export async function createDocuments(
    db: Db,
    users: Promise<DemoUserSet>,
    initialCheckout = true
): Promise<Document[]> {
    return Promise.all(documentInput.map(di => createDocument(db, di, users, initialCheckout)));
}

describe('documentDao', function() {
    let users;

    before('create users', async function() {
        users = await transacDemoUsers(pool);
    });

    after('delete users', cleanTable(pool, 'user'));

    describe('Create', function() {
        const msBefore = Date.now();

        afterEach('delete documents', async function() {
            await pool.transaction(async db => documentDao.deleteAll(db));
        });

        it('should create a document with checkout', async function() {
            const result = await pool.transaction(async db => {
                return documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: true,
                    },
                    users.tania.id
                );
            });
            expect(result.id).to.be.uuid();
            expect(result).to.deep.include({
                name: 'docname',
                description: 'doc description',
                createdBy: { id: users.tania.id },
                checkout: { id: users.tania.id },
            });
            expect(result.createdAt)
                .to.be.at.least(msBefore)
                .and.at.most(Date.now());
        });

        it('should create a document without checkout', async function() {
            const result = await pool.transaction(async db => {
                return documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: false,
                    },
                    users.tania.id
                );
            });
            expect(result.id).to.be.uuid();
            expect(result).to.deep.include({
                name: 'docname',
                description: 'doc description',
                createdBy: { id: users.tania.id },
                checkout: null,
            });
            expect(result.createdAt)
                .to.be.at.least(msBefore)
                .and.at.most(Date.now());
        });
    });

    describe('Read', function() {
        let documents;

        before('create documents', async function() {
            documents = await pool.transaction(async db => {
                return createDocuments(db, Promise.resolve(users));
            });
        });

        after('delete documents', async function() {
            return pool.transaction(async db => documentDao.deleteAll(db));
        });

        it('should read a document by id', async function() {
            const result = await pool.connect(async db => {
                return documentDao.byId(db, documents[0].id);
            });
            expect(result).to.deep.include(documents[0]);
        });

        it('should read a checkout id by document id', async function() {
            const result = await pool.connect(async db => {
                return documentDao.checkoutIdById(db, documents[0].id);
            });
            expect(result).to.equal(documents[0].checkout.id);
        });

        it('should read a document batch by ids', async function() {
            const result = await pool.connect(async db => {
                return documentDao.batchByIds(db, [documents[1].id, documents[0].id]);
            });
            expect(result).to.eql([documents[1], documents[0]]);
        });

        it('should search for documents', async function() {
            const result = await pool.connect(async db => {
                return documentDao.search(db, 'conduct', 0, 5);
            });
            expect(result).to.eql({
                count: 1,
                documents: [documents[0]],
            });
        });

        it('should paginate document search', async function() {
            const { res1, res2 } = await pool.connect(async db => {
                const res1 = await documentDao.search(db, '', 0, 1);
                const res2 = await documentDao.search(db, '', 1, 1);
                return { res1, res2 };
            });
            expect([res1.count, res2.count]).to.eql([2, 2]);
            expect(res1.documents)
                .to.be.an('array')
                .with.lengthOf(1);
            expect(res2.documents)
                .to.be.an('array')
                .with.lengthOf(1);
            expect(res1.documents[0].id).to.satisfy(
                id => id === documents[0].id || id === documents[1].id
            );
            expect(res2.documents[0].id).to.satisfy(
                id => id === documents[0].id || id === documents[1].id
            );
            expect(res1.documents[0].id).to.not.eql(res2.documents[0].id);
        });
    });

    describe('Checkout', function() {
        afterEach('delete documents', async function() {
            return pool.transaction(async db => documentDao.deleteAll(db));
        });

        it('should checkout a free document', async function() {
            const doc = await pool.transaction(async db => {
                const doc = await documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: false,
                    },
                    users.tania.id
                );

                return documentDao.checkout(db, doc.id, users.alphonse.id);
            });
            expect(doc).to.deep.include({
                checkout: { id: users.alphonse.id },
            });
        });

        it('shouldnt checkout a busy document', async function() {
            const doc = await pool.transaction(async db => {
                const doc = await documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: true,
                    },
                    users.tania.id
                );

                return documentDao.checkout(db, doc.id, users.alphonse.id);
            });
            expect(doc).to.deep.include({
                checkout: { id: users.tania.id },
            });
        });

        it('should discard checkout a busy document', async function() {
            const doc = await pool.transaction(async db => {
                const doc = await documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: true,
                    },
                    users.tania.id
                );

                return documentDao.discardCheckout(db, doc.id, users.tania.id);
            });
            expect(doc).to.deep.include({
                checkout: null,
            });
        });

        it('shouldnt discard checkout with wrong user', async function() {
            const doc = await pool.transaction(async db => {
                const doc = await documentDao.create(
                    db,
                    {
                        name: 'docname',
                        description: 'doc description',
                        initialCheckout: true,
                    },
                    users.tania.id
                );

                return documentDao.discardCheckout(db, doc.id, users.alphonse.id);
            });
            expect(doc).to.deep.include({
                checkout: { id: users.tania.id },
            });
        });
    });
});
