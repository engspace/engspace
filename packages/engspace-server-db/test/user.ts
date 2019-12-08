import chai from 'chai';
import { sql } from 'slonik';

import { prepareUsers, prepareUsersWithPswd, createUsers } from '@engspace/demo-data';
import { UserDao } from '../src';
import { pool } from '.';

const { expect } = chai;

async function deleteAll(): Promise<void> {
    await pool.connect(async db => db.query(sql`DELETE FROM "user"`));
}

describe('UserDao', () => {
    describe('Create', () => {
        const users = prepareUsers();
        const usersWithPswd = prepareUsersWithPswd();
        afterEach(deleteAll);
        it('should create user', async () => {
            await pool.connect(async db => {
                const returned = await UserDao.create(db, usersWithPswd[0]);
                returned.roles = await UserDao.rolesById(db, returned.id);
                expect(returned).to.deep.include(users[0]);
            });
        });
    });

    describe('Update', () => {
        let users;
        before('create users', async () => {
            users = await pool.transaction(db => createUsers(db));
        });
        after(deleteAll);
        it('should patch user', async () => {
            const patch = {
                fullName: 'New Name',
            };
            const returned = await pool.connect(async db => UserDao.patch(db, users[5].id, patch));
            expect(returned).to.include(patch);
        });
    });
});
