import { expect } from 'chai';
import { pool } from '.';
import { projectDao, documentDao, userDao } from '../src';
import { createUsers } from './user';
import { prepareUsers } from '@engspace/demo-data-input';

// fake v4 uuid
export const wrongUuid = '01234567-89ab-4000-8fff-cdef01234567';

describe('Dao Base', function() {
    describe('DaoIdent (with projectDao)', function() {
        afterEach('Delete projects', async function() {
            return pool.transaction(async db => projectDao.deleteAll(db));
        });

        it('should get a row by id', async function() {
            const { id } = await pool.transaction(async db => {
                return projectDao.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
            });
            const proj = await pool.connect(async db => {
                return projectDao.byId(db, id);
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
                return projectDao.byId(db, wrongUuid);
            });
            expect(proj).to.be.null;
        });

        it('should check that an id exists', async function() {
            const { id } = await pool.transaction(async db => {
                return projectDao.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
            });
            const has = await pool.connect(async db => {
                return projectDao.checkId(db, id);
            });
            expect(has).to.be.true;
        });

        it('should check that an id does not exist', async function() {
            const has = await pool.connect(async db => {
                return projectDao.checkId(db, wrongUuid);
            });
            expect(has).to.be.false;
        });

        it('should return a value batch', async function() {
            const { id1, id2 } = await pool.transaction(async db => {
                const proj1 = await projectDao.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
                const proj2 = await projectDao.create(db, {
                    name: 'd',
                    code: 'e',
                    description: 'f',
                });
                return { id1: proj1.id, id2: proj2.id };
            });
            const batch = await pool.connect(async db => {
                return projectDao.batchByIds(db, [id2, id1]);
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
                return projectDao.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
            });
            const proj = await pool.connect(async db => {
                return projectDao.deleteById(db, id);
            });
            expect(proj).to.deep.include({
                id,
                name: 'a',
                code: 'b',
                description: 'c',
            });
            const has = await pool.connect(async db => {
                return projectDao.checkId(db, id);
            });
            expect(has).to.be.false;
        });

        it('should get null if deleting wrong id', async function() {
            const doc = await pool.transaction(async db => {
                return projectDao.deleteById(db, wrongUuid);
            });
            expect(doc).to.be.null;
        });

        it('should delete all rows', async function() {
            const { id1, id2 } = await pool.transaction(async db => {
                const proj1 = await projectDao.create(db, {
                    name: 'a',
                    code: 'b',
                    description: 'c',
                });
                const proj2 = await projectDao.create(db, {
                    name: 'd',
                    code: 'e',
                    description: 'f',
                });
                return { id1: proj1.id, id2: proj2.id };
            });
            const deleted = await pool.connect(async db => {
                return projectDao.deleteAll(db);
            });
            expect(deleted).to.equal(2);
            const has = await pool.connect(async db => {
                return Promise.all([projectDao.checkId(db, id1), projectDao.checkId(db, id2)]);
            });
            expect(has).to.eql([false, false]);
        });
    });

    describe('DaoRowMap (with documentDao)', function() {
        let users;
        before('create users', async function() {
            users = await pool.transaction(async db => createUsers(db, prepareUsers()));
        });
        after('delete users', async function() {
            await pool.transaction(async db => userDao.deleteAll(db));
        });

        afterEach('Delete documents', async function() {
            return pool.transaction(async db => documentDao.deleteAll(db));
        });

        it('should get a row by id', async function() {
            const { id } = await pool.transaction(async db => {
                return documentDao.create(
                    db,
                    {
                        name: 'a',
                        description: 'b',
                        initialCheckout: false,
                    },
                    users.ambre.id
                );
            });
            const doc = await pool.connect(async db => {
                return documentDao.byId(db, id);
            });
            expect(doc).to.deep.include({
                id,
                name: 'a',
                description: 'b',
                createdBy: { id: users.ambre.id },
                checkout: null,
            });
        });

        it('should get null if unknown id', async function() {
            const doc = await pool.connect(async db => {
                return documentDao.byId(db, wrongUuid);
            });
            expect(doc).to.be.null;
        });

        it('should check that a row exists', async function() {
            const { id } = await pool.transaction(async db => {
                return documentDao.create(
                    db,
                    {
                        name: 'a',
                        description: 'b',
                        initialCheckout: false,
                    },
                    users.ambre.id
                );
            });
            const has = await pool.connect(async db => {
                return documentDao.checkId(db, id);
            });
            expect(has).to.be.true;
        });

        it('should check that a row does not exist', async function() {
            const has = await pool.connect(async db => {
                return documentDao.checkId(db, wrongUuid);
            });
            expect(has).to.be.false;
        });

        it('should batch rows by ids', async function() {
            const { id1, id2 } = await pool.transaction(async db => {
                const doc1 = await documentDao.create(
                    db,
                    {
                        name: 'a',
                        description: 'b',
                        initialCheckout: false,
                    },
                    users.ambre.id
                );
                const doc2 = await documentDao.create(
                    db,
                    {
                        name: 'c',
                        description: 'd',
                        initialCheckout: true,
                    },
                    users.tania.id
                );
                return { id1: doc1.id, id2: doc2.id };
            });
            const docs = await pool.connect(async db => {
                return documentDao.batchByIds(db, [id2, id1]);
            });
            expect(docs)
                .to.be.an('array')
                .with.lengthOf(2);
            expect(docs[0]).to.deep.include({
                id: id2,
                name: 'c',
                description: 'd',
                createdBy: { id: users.tania.id },
                checkout: { id: users.tania.id },
            });
            expect(docs[1]).to.deep.include({
                id: id1,
                name: 'a',
                description: 'b',
                createdBy: { id: users.ambre.id },
                checkout: null,
            });
        });

        it('should delete a row by id', async function() {
            const { id } = await pool.transaction(async db => {
                return documentDao.create(
                    db,
                    {
                        name: 'a',
                        description: 'b',
                        initialCheckout: false,
                    },
                    users.ambre.id
                );
            });
            const deleted = await pool.transaction(async db => {
                return documentDao.deleteById(db, id);
            });
            expect(deleted).to.deep.include({
                id,
                name: 'a',
                description: 'b',
                createdBy: { id: users.ambre.id },
                checkout: null,
            });
            const has = await pool.connect(async db => {
                return documentDao.checkId(db, id);
            });
            expect(has).to.be.false;
        });

        it('should get null if deleting wrong id', async function() {
            const doc = await pool.transaction(async db => {
                return documentDao.deleteById(db, wrongUuid);
            });
            expect(doc).to.be.null;
        });

        it('should delete all rows', async function() {
            const { id1, id2 } = await pool.transaction(async db => {
                const doc1 = await documentDao.create(
                    db,
                    {
                        name: 'a',
                        description: 'b',
                        initialCheckout: false,
                    },
                    users.ambre.id
                );
                const doc2 = await documentDao.create(
                    db,
                    {
                        name: 'c',
                        description: 'd',
                        initialCheckout: true,
                    },
                    users.tania.id
                );
                return { id1: doc1.id, id2: doc2.id };
            });
            const deleted = await pool.transaction(async db => {
                return documentDao.deleteAll(db);
            });
            expect(deleted).to.equal(2);
            const has = await pool.connect(async db => {
                return Promise.all([documentDao.checkId(db, id1), documentDao.checkId(db, id2)]);
            });
            expect(has).to.eql([false, false]);
        });
    });
});
