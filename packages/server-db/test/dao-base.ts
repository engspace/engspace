import { expect } from 'chai';
import { dao, pool, th } from '.';

// fake v4 uuid
export const wrongUuid = '01234567-89ab-4000-8fff-cdef01234567';

describe('Dao Base', function() {
    describe('DaoIdent (with dao.project)', function() {
        afterEach('Delete projects', th.cleanTable('project'));

        it('should get a row by id', async function() {
            const { id } = await pool.transaction(async db => {
                return dao.project.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
            });
            const proj = await pool.connect(async db => {
                return dao.project.byId(db, id);
            });
            expect(proj).to.deep.include({
                id,
                name: 'a',
                code: 'b',
                description: 'c',
            });
        });

        it('should get null with unknown uuid', async function() {
            const proj = await pool.connect(async db => {
                return dao.project.byId(db, wrongUuid);
            });
            expect(proj).to.be.null;
        });

        it('should get row count', async function() {
            const rc0 = await pool.connect(async db => {
                return dao.project.rowCount(db);
            });
            const rc10 = await pool.transaction(async db => {
                const p = [];
                for (let i = 0; i < 10; i++) {
                    p.push(
                        dao.project.create(db, {
                            code: `code${i}`,
                            name: `Proj${i}`,
                            description: `Project ${i}`,
                        })
                    );
                }
                await Promise.all(p);
                return dao.project.rowCount(db);
            });
            expect(rc0).to.equal(0);
            expect(rc10).to.equal(10);
        });

        it('should check that an id exists', async function() {
            const { id } = await pool.transaction(async db => {
                return dao.project.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
            });
            const has = await pool.connect(async db => {
                return dao.project.checkId(db, id);
            });
            expect(has).to.be.true;
        });

        it('should check that an id does not exist', async function() {
            const has = await pool.connect(async db => {
                return dao.project.checkId(db, wrongUuid);
            });
            expect(has).to.be.false;
        });

        it('should return a value batch', async function() {
            const { id1, id2 } = await pool.transaction(async db => {
                const proj1 = await dao.project.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
                const proj2 = await dao.project.create(db, {
                    name: 'd',
                    code: 'e',
                    description: 'f',
                });
                return { id1: proj1.id, id2: proj2.id };
            });
            const batch = await pool.connect(async db => {
                return dao.project.batchByIds(db, [id2, id1]);
            });
            expect(batch).to.eql([
                {
                    id: id2,
                    name: 'd',
                    code: 'e',
                    description: 'f',
                },
                {
                    id: id1,
                    name: 'a',
                    code: 'b',
                    description: 'c',
                },
            ]);
        });

        it('should delete by id', async function() {
            const { id } = await pool.transaction(async db => {
                return dao.project.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
            });
            const proj = await pool.connect(async db => {
                return dao.project.deleteById(db, id);
            });
            expect(proj).to.deep.include({
                id,
                name: 'a',
                code: 'b',
                description: 'c',
            });
            const has = await pool.connect(async db => {
                return dao.project.checkId(db, id);
            });
            expect(has).to.be.false;
        });

        it('should get null if deleting wrong id', async function() {
            const doc = await pool.transaction(async db => {
                return dao.project.deleteById(db, wrongUuid);
            });
            expect(doc).to.be.null;
        });

        it('should delete all rows', async function() {
            const { id1, id2 } = await pool.transaction(async db => {
                const proj1 = await dao.project.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
                const proj2 = await dao.project.create(db, {
                    name: 'd',
                    code: 'e',
                    description: 'f',
                });
                return { id1: proj1.id, id2: proj2.id };
            });
            const deleted = await pool.connect(async db => {
                return dao.project.deleteAll(db);
            });
            expect(deleted).to.equal(2);
            const has = await pool.connect(async db => {
                return Promise.all([dao.project.checkId(db, id1), dao.project.checkId(db, id2)]);
            });
            expect(has).to.eql([false, false]);
        });
    });

    describe('DaoRowMap (with dao.document)', function() {
        let users;
        before('create users', async function() {
            users = await th.transacUsersAB();
        });
        after('delete users', th.cleanTable('user'));

        afterEach('delete documents', th.cleanTable('document'));

        it('should get a row by id', async function() {
            const { id } = await pool.transaction(async db => {
                return dao.document.create(
                    db,
                    {
                        name: 'a',
                        description: 'b',
                        initialCheckout: false,
                    },
                    users.a.id
                );
            });
            const doc = await pool.connect(async db => {
                return dao.document.byId(db, id);
            });
            expect(doc).to.deep.include({
                id,
                name: 'a',
                description: 'b',
                createdBy: { id: users.a.id },
                checkout: null,
            });
        });

        it('should get null if unknown id', async function() {
            const doc = await pool.connect(async db => {
                return dao.document.byId(db, wrongUuid);
            });
            expect(doc).to.be.null;
        });

        it('should get row count', async function() {
            const rc0 = await pool.connect(async db => {
                return dao.document.rowCount(db);
            });
            const rc10 = await pool.transaction(async db => {
                const p = [];
                for (let i = 0; i < 10; i++) {
                    p.push(
                        dao.document.create(
                            db,
                            {
                                name: `doc${i}`,
                                description: `Document ${i}`,
                                initialCheckout: false,
                            },
                            users.a.id
                        )
                    );
                }
                await Promise.all(p);
                return dao.document.rowCount(db);
            });
            expect(rc0).to.equal(0);
            expect(rc10).to.equal(10);
        });

        it('should check that a row exists', async function() {
            const { id } = await pool.transaction(async db => {
                return dao.document.create(
                    db,
                    {
                        name: 'a',
                        description: 'b',
                        initialCheckout: false,
                    },
                    users.a.id
                );
            });
            const has = await pool.connect(async db => {
                return dao.document.checkId(db, id);
            });
            expect(has).to.be.true;
        });

        it('should check that a row does not exist', async function() {
            const has = await pool.connect(async db => {
                return dao.document.checkId(db, wrongUuid);
            });
            expect(has).to.be.false;
        });

        it('should batch rows by ids', async function() {
            const { id1, id2 } = await pool.transaction(async db => {
                const doc1 = await dao.document.create(
                    db,
                    {
                        name: 'a',
                        description: 'b',
                        initialCheckout: false,
                    },
                    users.a.id
                );
                const doc2 = await dao.document.create(
                    db,
                    {
                        name: 'c',
                        description: 'd',
                        initialCheckout: true,
                    },
                    users.b.id
                );
                return { id1: doc1.id, id2: doc2.id };
            });
            const docs = await pool.connect(async db => {
                return dao.document.batchByIds(db, [id2, id1]);
            });
            expect(docs)
                .to.be.an('array')
                .with.lengthOf(2);
            expect(docs[0]).to.deep.include({
                id: id2,
                name: 'c',
                description: 'd',
                createdBy: { id: users.b.id },
                checkout: { id: users.b.id },
            });
            expect(docs[1]).to.deep.include({
                id: id1,
                name: 'a',
                description: 'b',
                createdBy: { id: users.a.id },
                checkout: null,
            });
        });

        it('should delete a row by id', async function() {
            const { id } = await pool.transaction(async db => {
                return dao.document.create(
                    db,
                    {
                        name: 'a',
                        description: 'b',
                        initialCheckout: false,
                    },
                    users.a.id
                );
            });
            const deleted = await pool.transaction(async db => {
                return dao.document.deleteById(db, id);
            });
            expect(deleted).to.deep.include({
                id,
                name: 'a',
                description: 'b',
                createdBy: { id: users.a.id },
                checkout: null,
            });
            const has = await pool.connect(async db => {
                return dao.document.checkId(db, id);
            });
            expect(has).to.be.false;
        });

        it('should get null if deleting wrong id', async function() {
            const doc = await pool.transaction(async db => {
                return dao.document.deleteById(db, wrongUuid);
            });
            expect(doc).to.be.null;
        });

        it('should delete all rows', async function() {
            const { id1, id2 } = await pool.transaction(async db => {
                const doc1 = await dao.document.create(
                    db,
                    {
                        name: 'a',
                        description: 'b',
                        initialCheckout: false,
                    },
                    users.a.id
                );
                const doc2 = await dao.document.create(
                    db,
                    {
                        name: 'c',
                        description: 'd',
                        initialCheckout: true,
                    },
                    users.b.id
                );
                return { id1: doc1.id, id2: doc2.id };
            });
            const deleted = await pool.transaction(async db => {
                return dao.document.deleteAll(db);
            });
            expect(deleted).to.equal(2);
            const has = await pool.connect(async db => {
                return Promise.all([dao.document.checkId(db, id1), dao.document.checkId(db, id2)]);
            });
            expect(has).to.eql([false, false]);
        });
    });
});
