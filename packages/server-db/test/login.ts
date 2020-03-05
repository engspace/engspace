import { DemoUserSet } from '@engspace/demo-data-input';
import { expect } from 'chai';
import { sql } from 'slonik';
import { pool } from '.';
import { Db, loginDao, userDao } from '../src';
import { transacDemoUsers } from './helpers';

async function createLogins(db: Db, users: Promise<DemoUserSet>): Promise<void> {
    const usrs = await users;
    for (const name in usrs) {
        await loginDao.create(db, usrs[name].id, name);
    }
}

describe('Login', () => {
    let users: DemoUserSet;
    before('Create users', async function() {
        users = await transacDemoUsers();
    });
    after('Delete users', () => pool.connect(db => userDao.deleteAll(db)));

    describe('Create login', async () => {
        after('Delete logins', () => pool.connect(db => loginDao.deleteAll(db)));
        it('should create a login with password', async () => {
            await pool.connect(db => loginDao.create(db, users.fatima.id, 'her_password'));
            const ok = await pool.connect(db =>
                loginDao.checkById(db, users.fatima.id, 'her_password')
            );
            const nok = await pool.connect(db =>
                loginDao.checkById(db, users.fatima.id, 'not_her_password')
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
            const res = await pool.connect(db => loginDao.login(db, 'ambre', 'ambre'));
            const { id, name, roles } = users.ambre;
            expect(res).to.deep.include({
                id,
                name,
                roles,
            });
        });

        it('should return user info if log with email', async () => {
            const res = await pool.connect(db =>
                loginDao.login(db, 'ambre@engspace.demo', 'ambre')
            );
            const { id, name, roles } = users.ambre;
            expect(res).to.deep.include({
                id,
                name,
                roles,
            });
        });

        it('should return null if incorrect password', async () => {
            const res = await pool.connect(db => loginDao.login(db, 'ambre', 'pascal'));
            expect(res).to.be.null;
        });

        it('should return null if incorrect username', async () => {
            const res = await pool.connect(db => loginDao.login(db, 'nobody', 'a_password'));
            expect(res).to.be.null;
        });
    });

    describe('Check login', async () => {
        before('Create all logins', () =>
            pool.connect(db => createLogins(db, Promise.resolve(users)))
        );
        after('Delete logins', () => pool.connect(db => loginDao.deleteAll(db)));
        it('should accept correct password', async () => {
            const ok = await pool.connect(db => loginDao.checkById(db, users.pascal.id, 'pascal'));
            expect(ok).to.be.true;
        });
        it('should reject incorrect password', async () => {
            const nok = await pool.connect(db =>
                loginDao.checkById(db, users.alphonse.id, 'pascal')
            );
            expect(nok).to.be.false;
        });
    });

    describe('Patch login', async () => {
        beforeEach('Create all logins', () =>
            pool.connect(db => createLogins(db, Promise.resolve(users)))
        );
        afterEach('Delete logins', () => pool.connect(db => loginDao.deleteAll(db)));

        it('should patch an existing password', async () => {
            await pool.connect(db => loginDao.patch(db, users.tania.id, 'her_new_password'));
            const ok = await pool.connect(db =>
                loginDao.checkById(db, users.tania.id, 'her_new_password')
            );
            const nok = await pool.connect(db =>
                loginDao.checkById(db, users.tania.id, 'not_her_new_password')
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
            expect(await count()).to.equal(10);
            const ok = await pool.connect(db =>
                loginDao.checkById(db, users.alphonse.id, 'alphonse')
            );
            await pool.connect(db => loginDao.deleteById(db, users.alphonse.id));
            const nok = await pool.connect(db =>
                loginDao.checkById(db, users.alphonse.id, 'alphonse')
            );
            expect(await count()).to.equal(9);
            expect(ok).to.be.true;
            expect(nok).to.be.false;
        });
    });
});
