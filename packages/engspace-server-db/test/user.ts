import chai from 'chai';
import { sql } from 'slonik';

import { prepareUsers, prepareUsersWithPswd, createUsers } from '@engspace/demo-data';
import { Pool, UserDao } from '../src';

const { expect } = chai;

async function deleteAll(): Promise<void> {
    await Pool.connect(async db => db.query(sql`DELETE FROM "user"`));
}

describe('UserDao', () => {
    describe('Create', () => {
        const users = prepareUsers();
        const usersWithPswd = prepareUsersWithPswd();
        afterEach(deleteAll);
        it('should create user', async () => {
            await Pool.connect(async db => {
                const returned = await UserDao.create(db, usersWithPswd[0]);
                expect(returned).to.deep.include(users[0]);
            });
        });
    });

    describe('Update', () => {
        let users;
        before('create users', async () => {
            users = await Pool.transaction(db => createUsers(db));
        });
        after(deleteAll);
        it('should patch user', async () => {
            const patch = {
                fullName: 'New Name',
            };
            const returned = await Pool.connect(async db => UserDao.patch(db, users[5].id, patch));
            expect(returned).to.include(patch);
        });
    });
});
