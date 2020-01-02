import { createLogins, createUsers, DemoUserSet, prepareUsers } from '@engspace/demo-data';
import chai from 'chai';
import { sql } from 'slonik';
import { pool } from '.';
import { UserDao, LoginDao } from '../src';

const { expect } = chai;

describe('Login', () => {
    let users: DemoUserSet;
    before('Create users', async () => {
        users = await pool.connect(db => createUsers(db, prepareUsers()));
    });
    after('Delete users', () => pool.connect(db => UserDao.deleteAll(db)));

    describe('Create login', async () => {
        after('Delete logins', () => pool.connect(db => LoginDao.deleteAll(db)));
        it('should create a login with password', async () => {
            await pool.connect(db => LoginDao.create(db, users.fatima.id, 'her_password'));
            const ok = await pool.connect(db =>
                LoginDao.checkById(db, users.fatima.id, 'her_password')
            );
            const nok = await pool.connect(db =>
                LoginDao.checkById(db, users.fatima.id, 'not_her_password')
            );
            expect(ok).to.be.true;
            expect(nok).to.be.false;
        });
    });

    describe('Login procedure', async () => {
        before('Create all logins', () =>
            pool.connect(db => createLogins(db, Promise.resolve(users)))
        );
        after('Delete logins', () => pool.connect(db => LoginDao.deleteAll(db)));

        it('should return user info if log with username', async () => {
            const res = await pool.connect(db => LoginDao.login(db, 'ambre', 'ambre'));
            const { id, name, roles } = users.ambre;
            expect(res).to.deep.include({
                id,
                name,
                roles,
            });
        });

        it('should return user info if log with email', async () => {
            const res = await pool.connect(db =>
                LoginDao.login(db, 'ambre@engspace.demo', 'ambre')
            );
            const { id, name, roles } = users.ambre;
            expect(res).to.deep.include({
                id,
                name,
                roles,
            });
        });

        it('should return null if incorrect password', async () => {
            const res = await pool.connect(db => LoginDao.login(db, 'ambre', 'pascal'));
            expect(res).to.be.null;
        });

        it('should return null if incorrect username', async () => {
            const res = await pool.connect(db => LoginDao.login(db, 'nobody', 'a_password'));
            expect(res).to.be.null;
        });
    });

    describe('Check login', async () => {
        before('Create all logins', () =>
            pool.connect(db => createLogins(db, Promise.resolve(users)))
        );
        after('Delete logins', () => pool.connect(db => LoginDao.deleteAll(db)));
        it('should accept correct password', async () => {
            const ok = await pool.connect(db => LoginDao.checkById(db, users.pascal.id, 'pascal'));
            expect(ok).to.be.true;
        });
        it('should reject incorrect password', async () => {
            const nok = await pool.connect(db =>
                LoginDao.checkById(db, users.alphonse.id, 'pascal')
            );
            expect(nok).to.be.false;
        });
    });

    describe('Patch login', async () => {
        beforeEach('Create all logins', () =>
            pool.connect(db => createLogins(db, Promise.resolve(users)))
        );
        afterEach('Delete logins', () => pool.connect(db => LoginDao.deleteAll(db)));

        it('should patch an existing password', async () => {
            await pool.connect(db => LoginDao.patch(db, users.tania.id, 'her_new_password'));
            const ok = await pool.connect(db =>
                LoginDao.checkById(db, users.tania.id, 'her_new_password')
            );
            const nok = await pool.connect(db =>
                LoginDao.checkById(db, users.tania.id, 'not_her_new_password')
            );
            expect(ok).to.be.true;
            expect(nok).to.be.false;
        });
    });

    describe('Delete', async () => {
        beforeEach('Create all logins', () =>
            pool.connect(db => createLogins(db, Promise.resolve(users)))
        );
        afterEach('Delete logins', () => pool.connect(db => LoginDao.deleteAll(db)));

        it('should delete a login', async () => {
            const count = async (): Promise<number> =>
                pool.connect(async db => {
                    const c = await db.oneFirst(sql`SELECT COUNT(*) FROM user_login`);
                    return c as number;
                });
            expect(await count()).to.equal(10);
            const ok = await pool.connect(db =>
                LoginDao.checkById(db, users.alphonse.id, 'alphonse')
            );
            await pool.connect(db => LoginDao.deleteById(db, users.alphonse.id));
            const nok = await pool.connect(db =>
                LoginDao.checkById(db, users.alphonse.id, 'alphonse')
            );
            expect(await count()).to.equal(9);
            expect(ok).to.be.true;
            expect(nok).to.be.false;
        });
    });
});
