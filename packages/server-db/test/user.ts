import { DemoUserSet, prepareUsers } from '@engspace/demo-data-input';
import { expect } from 'chai';
import { filterFields, pool } from '.';
import { createDemoUsers } from '../dist';
import { userDao } from '../src';
import { cleanTable, transacDemoUsers } from './helpers';

describe('userDao', () => {
    describe('Create', () => {
        afterEach(cleanTable('user'));

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
                return userDao.create(db, {
                    name: 'user.a',
                    email: 'user.a@domain.net',
                    fullName: 'User A',
                    roles: ['role1', 'role2'],
                });
            });
            expect(userA).to.deep.include({
                name: 'user.a',
                email: 'user.a@domain.net',
                fullName: 'User A',
                roles: ['role1', 'role2'],
            });
        });
    });

    describe('Get', () => {
        let users: DemoUserSet;
        before('create users', async () => {
            users = await pool.transaction(async db => await createDemoUsers(db, prepareUsers()));
        });
        after(cleanTable('user'));
        it('should get user by id', async () => {
            const expected = filterFields(users.tania, 'roles');
            const tania = await pool.connect(async db => await userDao.byId(db, users.tania.id));
            expect(tania).to.deep.include(expected);
        });
        it('should get user by username', async () => {
            const expected = filterFields(users.tania, 'roles');
            const tania = await pool.connect(async db => await userDao.byName(db, 'tania'));
            expect(tania).to.deep.include(expected);
        });
        it('should get user by email', async () => {
            const expected = filterFields(users.tania, 'roles');
            const tania = await pool.connect(
                async db => await userDao.byEmail(db, 'tania@engspace.demo')
            );
            expect(tania).to.deep.include(expected);
        });
        it('should get the roles by id', async () => {
            const expected = ['manager'];
            const roles = await pool.connect(db => userDao.rolesById(db, users.ambre.id));
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
                userDao.batchByIds(db, [
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
        before('create users', async function() {
            users = await transacDemoUsers();
        });
        after(cleanTable('user'));

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
                    await userDao.search(db, {
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
                    await userDao.search(db, {
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
            const result = await pool.connect(async db => {
                return userDao.search(db, {
                    phrase: 'pH',
                    offset: 1,
                    limit: 1,
                });
            });
            expect(result).to.deep.include(expected);
        });

        it('should find user by role', async () => {
            const result = await pool.connect(async db => {
                return userDao.search(db, {
                    role: 'manager',
                });
            });
            expect(result.count).to.equal(1);
            expect(result.users)
                .to.be.an('array')
                .with.lengthOf(1);
            expect(result.users[0]).to.deep.include({
                id: users.ambre.id,
            });
        });
    });

    describe('Update', function() {
        let userA;
        beforeEach('create users', async () => {
            userA = await pool.transaction(async db =>
                userDao.create(db, {
                    name: 'user.a',
                    email: 'user.a@domain.net',
                    fullName: 'User A',
                    roles: ['role1', 'role2'],
                })
            );
        });
        afterEach(cleanTable('user'));

        it('should update user', async function() {
            const userB = await pool.transaction(async db => {
                return userDao.update(db, userA.id, {
                    name: 'user.b',
                    email: 'user.b@domain.net',
                    fullName: 'User B',
                });
            });
            expect(userB).to.eql({
                id: userA.id,
                name: 'user.b',
                email: 'user.b@domain.net',
                fullName: 'User B',
            });
            const roles = await pool.connect(async db => {
                return userDao.rolesById(db, userA.id);
            });
            expect(roles).to.have.members(['role1', 'role2']);
        });

        it('should update user and roles', async function() {
            const userB = await pool.transaction(async db => {
                return userDao.update(db, userA.id, {
                    name: 'user.b',
                    email: 'user.b@domain.net',
                    fullName: 'User B',
                    roles: ['role2', 'role3'],
                });
            });
            expect(userB).to.eql({
                id: userA.id,
                name: 'user.b',
                email: 'user.b@domain.net',
                fullName: 'User B',
                roles: ['role2', 'role3'],
            });
        });
    });

    describe('Patch', () => {
        let userA;
        beforeEach('create users', async () => {
            userA = await pool.transaction(async db =>
                userDao.create(db, {
                    name: 'user.a',
                    email: 'user.a@domain.net',
                    fullName: 'User A',
                    roles: ['role1', 'role2'],
                })
            );
        });
        afterEach(cleanTable('user'));

        it('should patch user full name', async () => {
            const patch = {
                fullName: 'New Name',
            };
            const returned = await pool.connect(async db => {
                return userDao.patch(db, userA.id, patch);
            });
            expect(returned).to.deep.include({
                name: 'user.a',
                fullName: 'New Name',
                email: 'user.a@domain.net',
            });
            const roles = await pool.connect(async db => {
                return userDao.rolesById(db, userA.id);
            });
            expect(roles).to.have.members(['role1', 'role2']);
        });

        it('should patch user roles', async () => {
            const patch = {
                roles: ['role2', 'role3'],
            };
            const returned = await pool.connect(async db => {
                return userDao.patch(db, userA.id, patch);
            });
            expect(returned).to.deep.include({
                name: 'user.a',
                fullName: 'User A',
                email: 'user.a@domain.net',
            });
            expect(returned.roles).to.have.members(['role2', 'role3']);
        });

        it('should throw with empty patch', async () => {
            const patch = {};
            const returned = pool.transaction(async db => {
                return userDao.patch(db, userA.id, patch);
            });
            await expect(returned).to.be.rejectedWith('no valid field to patch');
        });
    });
});
