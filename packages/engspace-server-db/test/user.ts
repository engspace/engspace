import chai from 'chai';
import { sql } from 'slonik';

import { prepareUsers, prepareUsersWithPswd } from '@engspace/demo-data';
import { Pool, UserDao } from '../src';

const { expect } = chai;

async function deleteAll(): Promise<void> {
    await Pool.connect(async db => db.query(sql`DELETE FROM "user"`));
}

describe('UserDao', () => {
    const users = prepareUsers();
    const usersWithPswd = prepareUsersWithPswd();

    before(deleteAll);
    afterEach(deleteAll);

    it('should create user', async () => {
        await Pool.connect(async db => {
            const returned = await UserDao.create(db, usersWithPswd[0]);
            expect(returned).to.deep.include(users[0]);
        });
    });
});
