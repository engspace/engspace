import { User } from '@engspace/core';
import { expect } from 'chai';
import deepEqual from 'deep-equal';
import { filterFields, pool } from '.';
import { userDao } from '../src';
import { cleanTable, Dict, dictMap, transacUser, transacUsers } from '../src/test-helpers';

describe('userDao', () => {
    describe('Create', () => {
        afterEach(cleanTable(pool, 'user'));

        it('should create user', async () => {
            const userA = await pool.transaction(async db => {
                return userDao.create(db, {
                    name: 'user.a',
                    email: 'user.a@domain.net',
                    fullName: 'User A',
                });
            });
            expect(userA).to.deep.include({
                name: 'user.a',
                email: 'user.a@domain.net',
                fullName: 'User A',
            });
            const roles = await pool.connect(async db => {
                return userDao.rolesById(db, userA.id);
            });
            expect(roles).to.be.an('array').empty;
        });

        it('should create user with roles', async () => {
            const userA = await pool.transaction(async db => {
                const u = await userDao.create(
                    db,
                    {
                        name: 'user.a',
                        email: 'user.a@domain.net',
                        fullName: 'User A',
                        roles: ['role1', 'role2'],
                    },
                    { withRoles: true }
                );
                return u;
            });
            expect(userA).to.deep.include({
                name: 'user.a',
                email: 'user.a@domain.net',
                fullName: 'User A',
                roles: ['role1', 'role2'],
            });
        });
        it('should create user without roles', async () => {
            const userA = await pool.transaction(async db => {
                const u = await userDao.create(
                    db,
                    {
                        name: 'user.a',
                        email: 'user.a@domain.net',
                        fullName: 'User A',
                        roles: ['role1', 'role2'],
                    },
                    { withRoles: false }
                );
                return u;
            });
            expect(userA).to.deep.include({
                name: 'user.a',
                email: 'user.a@domain.net',
                fullName: 'User A',
            });
            expect(userA).to.not.have.property('roles');
        });
    });

    describe('Get', () => {
        let users: Dict<User>;

        before('create users', async () => {
            users = await transacUsers(pool, {
                a: { name: 'user.a', fullName: 'User A', roles: ['user'] },
                b: { name: 'user.b', fullName: 'User B', roles: ['manager'] },
                c: { name: 'user.c', fullName: 'User C', roles: ['admin'] },
            });
        });
        after(cleanTable(pool, 'user'));

        it('should get user by id', async () => {
            const a = await pool.connect(async db => await userDao.byId(db, users.a.id));
            expect(a).to.deep.include(filterFields(users.a, 'roles'));
        });
        it('should get user by id with roles', async () => {
            const a = await pool.connect(
                async db => await userDao.byId(db, users.a.id, { withRoles: true })
            );
            expect(a).to.deep.include(users.a);
        });
        it('should get user by username', async () => {
            const c = await pool.connect(async db => await userDao.byName(db, 'user.c'));
            expect(c).to.deep.include(filterFields(users.c, 'roles'));
        });
        it('should get user by username with roles', async () => {
            const c = await pool.connect(
                async db => await userDao.byName(db, 'user.c', { withRoles: true })
            );
            expect(c).to.deep.include(users.c);
        });
        it('should get user by email', async () => {
            const b = await pool.connect(
                async db => await userDao.byEmail(db, 'user.b@engspace.net')
            );
            expect(b).to.deep.include(filterFields(users.b, 'roles'));
        });
        it('should get user by email with roles', async () => {
            const b = await pool.connect(
                async db => await userDao.byEmail(db, 'user.b@engspace.net', { withRoles: true })
            );
            expect(b).to.deep.include(users.b);
        });
        it('should get the roles by id', async () => {
            const roles = await pool.connect(db => userDao.rolesById(db, users.b.id));
            expect(roles).to.eql(['manager']);
        });
        it('should batch get users', async () => {
            const batch = await pool.connect(db =>
                userDao.batchByIds(db, [users.b.id, users.c.id, users.a.id])
            );
            expect(batch).to.eql([
                filterFields(users.b, 'roles'),
                filterFields(users.c, 'roles'),
                filterFields(users.a, 'roles'),
            ]);
        });
    });

    describe('Search', () => {
        let users: Dict<User>;

        before('create users', async () => {
            const usrs = await transacUsers(pool, {
                alphonse: { name: 'alphonse', fullName: 'Alphonse', roles: ['user'] },
                philippe: { name: 'philippe', fullName: 'Philippe', roles: ['manager'] },
                sophie: { name: 'sophie', fullName: 'Sophie', roles: ['admin'] },
                ambre: { name: 'ambre', fullName: 'Ambre', roles: ['admin', 'manager'] },
            });
            users = dictMap(usrs, u => filterFields(u, 'roles'));
        });
        after(cleanTable(pool, 'user'));

        it('should find users partial name', async () => {
            const result = await pool.connect(
                async db =>
                    await userDao.search(db, {
                        phrase: 'ph',
                    })
            );
            expect(result).to.deep.include({
                count: 3,
            });
            expect(result.users).to.have.deep.members([
                users.alphonse,
                users.sophie,
                users.philippe,
            ]);
        });

        it('should find with limit and offset', async () => {
            const result = await pool.connect(
                async db =>
                    await userDao.search(db, {
                        phrase: 'ph',
                        offset: 1,
                        limit: 1,
                    })
            );
            expect(result).to.deep.include({
                count: 3,
            });
            expect(result.users)
                .to.be.an('array')
                .with.lengthOf(1);

            expect(result.users[0]).to.satisfy(
                user =>
                    deepEqual(user, users.alphonse) ||
                    deepEqual(user, users.philippe) ||
                    deepEqual(user, users.sophie)
            );
        });

        it('should find with case insensitivity', async () => {
            const result = await pool.connect(async db => {
                return userDao.search(db, {
                    phrase: 'pH',
                    offset: 1,
                    limit: 1,
                });
            });
            expect(result).to.deep.include({
                count: 3,
            });
            expect(result.users)
                .to.be.an('array')
                .with.lengthOf(1);
            expect(result.users[0]).to.satisfy(
                user =>
                    deepEqual(user, users.alphonse) ||
                    deepEqual(user, users.philippe) ||
                    deepEqual(user, users.sophie)
            );
        });

        it('should find user by role', async () => {
            const result = await pool.connect(async db => {
                return userDao.search(db, {
                    role: 'manager',
                });
            });
            expect(result.count).to.equal(2);
            expect(result.users)
                .to.be.an('array')
                .with.lengthOf(2);
            expect(result.users).to.have.deep.members([users.philippe, users.ambre]);
        });
    });

    describe('Update', function() {
        let userA;
        beforeEach('create users', async () => {
            userA = await transacUser(pool, {
                name: 'user.a',
                fullName: 'User A',
                roles: ['role1', 'role2'],
            });
        });
        afterEach(cleanTable(pool, 'user'));

        it('should update user', async function() {
            const userB = await pool.transaction(async db => {
                return userDao.update(db, userA.id, {
                    name: 'user.b',
                    email: 'user.b@engspace.net',
                    fullName: 'User B',
                });
            });
            expect(userB).to.eql({
                id: userA.id,
                name: 'user.b',
                email: 'user.b@engspace.net',
                fullName: 'User B',
            });
            const roles = await pool.connect(async db => {
                return userDao.rolesById(db, userA.id);
            });
            expect(roles).to.have.members(['role1', 'role2']);
        });

        it('should update user and roles', async function() {
            const userB = await pool.transaction(async db => {
                const b = await userDao.update(db, userA.id, {
                    name: 'user.b',
                    email: 'user.b@engspace.net',
                    fullName: 'User B',
                });
                b.roles = await userDao.updateRoles(db, userA.id, ['role2', 'role3']);
                return b;
            });
            expect(userB).to.eql({
                id: userA.id,
                name: 'user.b',
                email: 'user.b@engspace.net',
                fullName: 'User B',
                roles: ['role2', 'role3'],
            });
        });
    });
});
