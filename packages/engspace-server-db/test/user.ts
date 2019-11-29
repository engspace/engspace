import chai from 'chai';
import { sql } from 'slonik';

import { IUser } from '@engspace/core';
import { prepareUsers, prepareUsersWithPswd } from '@engspace/demo-data';
import { Pool, UserDao } from '../src';

const { expect } = chai;

async function deleteAll(): Promise<void> {
    await Pool.connect(async db => db.query(sql`DELETE FROM "user"`));
}

describe('UserDao', () => {
    let users: IUser[];
    let usersWithPswd: IUser[];

    before(async () => {
        await Pool.connect(async db => {
            users = await prepareUsers(db);
            usersWithPswd = await prepareUsersWithPswd(db);
        });
    });

    before(deleteAll);
    afterEach(deleteAll);

    it('should create user', async () => {
        await Pool.connect(async db => {
            const returned = await UserDao.create(db, usersWithPswd[0]);
            expect(returned).to.deep.include(users[0]);
        });
    });
});
