import { User } from '@engspace/core';
import { expect } from 'chai';
import { sql } from 'slonik';
import { pool } from '.';
import { Db, loginDao, userDao } from '../src';
import { Dict, transacUsers } from '../src/test-helpers';

async function createLogins(db: Db, users: Promise<Dict<User>>): Promise<void> {
    const usrs = await users;
    for (const name in usrs) {
        await loginDao.create(db, usrs[name].id, `${name}.pass`);
    }
}

describe('Login', () => {
    let users;
    before('Create users', async function() {
        users = await transacUsers(pool, {
            a: { name: 'a', roles: ['a1', 'a2'] },
            b: { name: 'b', roles: ['b1', 'b2'] },
        });
    });
    after('Delete users', () => pool.connect(db => userDao.deleteAll(db)));

    describe('Create login', async () => {
        after('Delete logins', () => pool.connect(db => loginDao.deleteAll(db)));
        it('should create a login with password', async () => {
            await pool.connect(db => loginDao.create(db, users.a.id, 'correct_password'));
            const ok = await pool.connect(db =>
                loginDao.checkById(db, users.a.id, 'correct_password')
            );
            const nok = await pool.connect(db =>
                loginDao.checkById(db, users.a.id, 'incorrect_password')
            );
            expect(ok).to.be.true;
            expect(nok).to.be.false;
        });
    });

    describe('Login procedure', async () => {
        before('Create all logins', () =>
            pool.connect(db => createLogins(db, Promise.resolve(users)))
        );
        after('Delete logins', () => pool.connect(db => loginDao.deleteAll(db)));

        it('should return user info if log with username', async () => {
            const res = await pool.connect(db => loginDao.login(db, 'b', 'b.pass'));
            const { id, name } = users.b;
            expect(res).to.deep.include({
                id,
                name,
                roles: ['b1', 'b2'],
            });
        });

        it('should return user info if log with email', async () => {
            const res = await pool.connect(db => loginDao.login(db, 'a@engspace.net', 'a.pass'));
            const { id, name } = users.a;
            expect(res).to.deep.include({
                id,
                name,
                roles: ['a1', 'a2'],
            });
        });

        it('should return null if incorrect password', async () => {
            const res = await pool.connect(db => loginDao.login(db, 'a', 'b.pass'));
            expect(res).to.be.null;
        });

        it('should return null if incorrect username', async () => {
            const res = await pool.connect(db => loginDao.login(db, 'nobody', 'a.pass'));
            expect(res).to.be.null;
        });
    });

    describe('Check login', async () => {
        before('Create all logins', () =>
            pool.connect(db => createLogins(db, Promise.resolve(users)))
        );
        after('Delete logins', () => pool.connect(db => loginDao.deleteAll(db)));
        it('should accept correct password', async () => {
            const ok = await pool.connect(db => loginDao.checkById(db, users.a.id, 'a.pass'));
            expect(ok).to.be.true;
        });
        it('should reject incorrect password', async () => {
            const nok = await pool.connect(db => loginDao.checkById(db, users.a.id, 'b.pass'));
            expect(nok).to.be.false;
        });
    });

    describe('Patch login', async () => {
        beforeEach('Create all logins', () =>
            pool.connect(db => createLogins(db, Promise.resolve(users)))
        );
        afterEach('Delete logins', () => pool.connect(db => loginDao.deleteAll(db)));

        it('should patch an existing password', async () => {
            await pool.connect(db => loginDao.patch(db, users.a.id, 'new_password'));
            const ok = await pool.connect(db => loginDao.checkById(db, users.a.id, 'new_password'));
            const nok = await pool.connect(db =>
                loginDao.checkById(db, users.a.id, 'not_new_password')
            );
            expect(ok).to.be.true;
            expect(nok).to.be.false;
        });
    });

    describe('Delete', async () => {
        beforeEach('Create all logins', () =>
            pool.connect(db => createLogins(db, Promise.resolve(users)))
        );
        afterEach('Delete logins', () => pool.connect(db => loginDao.deleteAll(db)));

        it('should delete a login', async () => {
            const count = async (): Promise<number> =>
                pool.connect(async db => {
                    const c = await db.oneFirst(sql`SELECT COUNT(*) FROM user_login`);
                    return c as number;
                });
            expect(await count()).to.equal(2);
            const ok = await pool.connect(db => loginDao.checkById(db, users.a.id, 'a.pass'));
            await pool.connect(db => loginDao.deleteById(db, users.a.id));
            const nok = await pool.connect(db => loginDao.checkById(db, users.a.id, 'a.pass'));
            expect(await count()).to.equal(1);
            expect(ok).to.be.true;
            expect(nok).to.be.false;
        });
    });
});
