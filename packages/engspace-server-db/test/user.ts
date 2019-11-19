import chai from 'chai';
import { sql } from 'slonik';

import { prepareUsers, prepareUsersWithPswd } from '@engspace/demo-data';
import { Pool, UserDao } from '../src';

const { expect } = chai;

describe('UserDao', () => {
    const users = prepareUsers();
    const usersWithPswd = prepareUsersWithPswd();

    afterEach(async () => {
        await Pool.connect(async db => db.query(sql`DELETE FROM "user"`));
    });

    it('should create user', async () => {
        await Pool.connect(async db => {
            const returned = await UserDao.create(db, usersWithPswd[0]);
            expect(returned).to.deep.include(users[0]);

            const created = await db.one(sql`
                SELECT name, email, full_name, admin, manager
                FROM "user" WHERE id = ${returned.id as number}
            `);
            expect(created).to.deep.equal(users[0]);
        });
    });
});
