import { Role } from '@engspace/core';
import { createUsers, DemoUserSet, prepareUsers } from '@engspace/demo-data';
import chai from 'chai';
import { sql } from 'slonik';
import { pool } from '.';
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
