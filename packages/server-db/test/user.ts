import { Role } from '@engspace/core';
import { createUsers, DemoUserSet, prepareUsers } from '@engspace/demo-data';
import chai from 'chai';
import { sql } from 'slonik';
import { filterFields, pool } from '.';
import { UserDao } from '../src';

const { expect } = chai;

async function deleteAll(): Promise<void> {
    await pool.connect(async db => db.query(sql`DELETE FROM "user"`));
}

describe('UserDao', () => {
    describe('Create', () => {
        const users = prepareUsers();
        afterEach(deleteAll);
        it('should create user', async () => {
            await pool.connect(async db => {
                const returned = await UserDao.create(db, users.gerard);
                expect(returned).to.deep.include(users.gerard);
            });
        });
    });

    describe('Get', () => {
        let users: DemoUserSet;
        before('create users', async () => {
            users = await pool.transaction(async db => await createUsers(db, prepareUsers()));
        });
        after(deleteAll);
        it('should get user by id', async () => {
            const expected = filterFields(users.tania, 'roles');
            const tania = await pool.connect(async db => await UserDao.byId(db, users.tania.id));
            expect(tania).to.deep.include(expected);
        });
        it('should get user by username', async () => {
            const expected = filterFields(users.tania, 'roles');
            const tania = await pool.connect(async db => await UserDao.byName(db, 'tania'));
            expect(tania).to.deep.include(expected);
        });
        it('should get user by email', async () => {
            const expected = filterFields(users.tania, 'roles');
            const tania = await pool.connect(
                async db => await UserDao.byEmail(db, 'tania@engspace.demo')
            );
            expect(tania).to.deep.include(expected);
        });
        it('should get the roles by id', async () => {
            const expected = [Role.Manager];
            const roles = await pool.connect(db => UserDao.rolesById(db, users.ambre.id));
            expect(roles).to.eql(expected);
        });
        it('should batch get users', async () => {
            const expected = [
                filterFields(users.ambre, 'roles'),
                filterFields(users.alphonse, 'roles'),
                filterFields(users.sylvie, 'roles'),
                filterFields(users.fatima, 'roles'),
            ];
            const batch = await pool.connect(db =>
                UserDao.batchByIds(db, [
                    users.ambre.id,
                    users.alphonse.id,
                    users.sylvie.id,
                    users.fatima.id,
                ])
            );
            expect(batch).to.eql(expected);
        });
    });

    describe('Search', () => {
        let users: DemoUserSet;
        before('create users', async () => {
            users = await pool.transaction(async db => await createUsers(db, prepareUsers()));
        });
        after(deleteAll);
        it('should find users partial name', async () => {
            const expected = {
                count: 3,
                users: [
                    filterFields(users.alphonse, 'roles'),
                    filterFields(users.sophie, 'roles'),
                    filterFields(users.philippe, 'roles'),
                ],
            };
            const result = await pool.connect(
                async db =>
                    await UserDao.search(db, {
                        phrase: 'ph',
                    })
            );
            expect(result).to.deep.include(expected);
        });
        it('should find with limit and offset', async () => {
            const expected = {
                count: 3,
                users: [filterFields(users.sophie, 'roles')],
            };
            const result = await pool.connect(
                async db =>
                    await UserDao.search(db, {
                        phrase: 'ph',
                        offset: 1,
                        limit: 1,
                    })
            );
            expect(result).to.deep.include(expected);
        });
        it('should find with case insensitivity', async () => {
            const expected = {
                count: 3,
                users: [filterFields(users.sophie, 'roles')],
            };
            const result = await pool.connect(
                async db =>
                    await UserDao.search(db, {
                        phrase: 'pH',
                        offset: 1,
                        limit: 1,
                    })
            );
            expect(result).to.deep.include(expected);
        });
    });

    describe('Patch', () => {
        let users: DemoUserSet;
        beforeEach('create users', async () => {
            users = await pool.transaction(async db => await createUsers(db, prepareUsers()));
        });
        afterEach(deleteAll);
        it('should patch user full name', async () => {
            const patch = {
                fullName: 'New Name',
            };
            const returned = await pool.connect(async db =>
                UserDao.patch(db, users.alphonse.id, patch)
            );
            expect(returned).to.include(patch);
            // role is not returned because not patched
            const { id, name, email } = users.alphonse;
            expect(returned).to.deep.include({
                id,
                name,
                email,
                ...patch,
            });
        });
        it('should patch user roles', async () => {
            const patch = {
                roles: [Role.Admin, Role.Manager],
            };
            const returned = await pool.connect(async db =>
                UserDao.patch(db, users.tania.id, patch)
            );
            expect(returned).to.deep.include(patch);
            expect(returned).to.deep.include({
                ...users.tania,
                ...patch,
            });
        });
    });
});
