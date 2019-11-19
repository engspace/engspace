import chai from 'chai';
import HttpStatus from 'http-status-codes';
import { CommonQueryMethodsType, sql } from 'slonik';

import { IUser } from '@engspace/core';
import { Pool, UserDao } from '@engspace/server-db';
import { app } from '../src';
import {
    adminToken,
    managerToken,
    userTokens,
    UserSet,
    UsersAndTokens,
} from './auth';

const { expect } = chai;

export const userTemplates = {
    admin: {
        name: 'admin',
        email: 'admin@engspace.test',
        fullName: 'Admin Name',
        admin: true,
        manager: false,
        password: 'admin',
    },
    manager: {
        name: 'manager',
        email: 'manager@engspace.test',
        fullName: 'Manager Name',
        admin: false,
        manager: true,
        password: 'manager',
    },
    user: {
        name: 'user',
        email: 'user@engspace.test',
        fullName: 'User Name',
        admin: false,
        manager: false,
        password: 'user',
    },
};

const createAdmin = async (db: CommonQueryMethodsType): Promise<IUser> =>
    UserDao.create(db, userTemplates.admin);
const createManager = async (db: CommonQueryMethodsType): Promise<IUser> =>
    UserDao.create(db, userTemplates.manager);
const createUser = async (db: CommonQueryMethodsType): Promise<IUser> =>
    UserDao.create(db, userTemplates.user);

export const createUsers = async (): Promise<UserSet> =>
    Pool.connect(async (db: CommonQueryMethodsType) => {
        return {
            admin: await createAdmin(db),
            manager: await createManager(db),
            user: await createUser(db),
        };
    });

export const deleteUsers = async (): Promise<void> =>
    Pool.connect(db => UserDao.deleteAll(db));

export const usersAndTokens = async (): Promise<UsersAndTokens> => {
    const users = await createUsers();
    const tokens = await userTokens();
    return { users, tokens };
};

const filterField = (obj: any, field: string): any => {
    if (!(field in obj)) {
        throw new Error(`object has no field ${field}`);
    }
    const newObj = Object.assign({}, obj);
    delete newObj[field];
    return newObj;
};

const checkPassword = async (id: number, password: string): Promise<boolean> =>
    Pool.connect(async db => {
        const ok = await db.oneFirst(sql`
            SELECT (password = crypt(${password}, password)) as ok
            FROM "user" WHERE id = ${id}
        `);
        return (ok as unknown) as boolean;
    });

describe('Users', function() {
    describe('GET /api/users', function() {
        let users: any;
        let tokens: any;

        beforeEach('create users and fetch user token', async () => {
            ({ users, tokens } = await usersAndTokens());
        });

        afterEach('clean up users', deleteUsers);

        it('should reject unauthorized access', async () => {
            const res = await chai.request(app).get('/api/users');
            expect(res).to.have.status(HttpStatus.UNAUTHORIZED);
        });

        it('should get all users', async () => {
            const res = await chai
                .request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${tokens.user}`);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body)
                .to.be.an('array')
                .of.lengthOf(3);
            expect(res.body).to.deep.include(users.admin);
            expect(res.body).to.deep.include(users.manager);
            expect(res.body).to.deep.include(users.user);
        });

        it('should get only admin', async () => {
            const res = await chai
                .request(app)
                .get('/api/users')
                .query({ admin: true })
                .set('Authorization', `Bearer ${tokens.user}`);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body)
                .to.be.an('array')
                .of.lengthOf(1)
                .that.deep.include(users.admin);
        });

        it('should get only manager', async () => {
            const res = await chai
                .request(app)
                .get('/api/users')
                .query({ manager: true } as object)
                .set('Authorization', `Bearer ${tokens.user}`);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body)
                .to.be.an('array')
                .of.lengthOf(1)
                .that.deep.include(users.manager);
        });

        it('should find user', async () => {
            const res = await chai
                .request(app)
                .get('/api/users')
                .query({ search: 'user' } as object)
                .set('Authorization', `Bearer ${tokens.user}`);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body)
                .to.be.an('array')
                .of.lengthOf(1)
                .that.deep.include(users.user);
        });

        it('should not find any user', async () => {
            const res = await chai
                .request(app)
                .get('/api/users')
                .query({ search: 'nobody' } as object)
                .set('Authorization', `Bearer ${tokens.user}`);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body)
                .to.be.an('array')
                .of.lengthOf(0);
        });
    });

    describe('POST /api/users', () => {
        let adminTok: any;
        let managerTok: any;
        before('create admin and fetch token', async () => {
            await Pool.connect(db =>
                Promise.all([createAdmin(db), createManager(db)])
            );
            [adminTok, managerTok] = await Promise.all([
                adminToken(),
                managerToken(),
            ]);
        });

        after('clean up users', deleteUsers);

        it('should reject unauthorized access', async () => {
            const res = await chai
                .request(app)
                .post('/api/users')
                .send(userTemplates.user);
            expect(res).to.have.status(HttpStatus.UNAUTHORIZED);
        });

        it('should reject non-admin access', async () => {
            const res = await chai
                .request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${managerTok}`)
                .send(userTemplates.user);
            expect(res).to.have.status(HttpStatus.FORBIDDEN);
        });

        it('should create user', async () => {
            const res = await chai
                .request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${adminTok}`)
                .send(userTemplates.user);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            const result = res.body;
            expect(result).to.deep.include(
                filterField(userTemplates.user, 'password')
            );
            const user = await Pool.connect(db =>
                UserDao.findById(db, result.id)
            );
            expect(user).to.not.be.null;
            expect(user).to.deep.include(result);
        });
    });

    describe('PATCH /api/users/:id', () => {
        let users: any;
        let tokens: any;
        const emailUpdate = {
            email: 'other.email@engspace.test',
        };
        beforeEach('create users and get tokens', async () => {
            ({ users, tokens } = await usersAndTokens());
        });
        afterEach('clean up users', deleteUsers);

        it('should reject unauthorized user', async () => {
            const res = await chai
                .request(app)
                .patch(`/api/users/${users.user.id}`)
                .send(emailUpdate);
            expect(res).to.have.status(HttpStatus.UNAUTHORIZED);
        });

        it('should reject non-admin and foreign user', async () => {
            const res = await chai
                .request(app)
                .patch(`/api/users/${users.user.id}`)
                .set('Authorization', `Bearer ${tokens.manager}`)
                .send(emailUpdate);
            expect(res).to.have.status(HttpStatus.FORBIDDEN);
        });

        it('should update with admin access', async () => {
            const res = await chai
                .request(app)
                .patch(`/api/users/${users.user.id}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send(emailUpdate);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body).to.include({
                name: 'user',
                email: 'other.email@engspace.test',
            });
            const email = await Pool.connect(
                async db => (await UserDao.findById(db, users.user.id)).email
            );
            expect(email).to.equal('other.email@engspace.test');
        });

        it('should update with same user access', async () => {
            const res = await chai
                .request(app)
                .patch(`/api/users/${users.user.id}`)
                .set('Authorization', `Bearer ${tokens.user}`)
                .send(emailUpdate);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body).to.include({
                name: 'user',
                email: 'other.email@engspace.test',
            });
            const email = await Pool.connect(
                async db => (await UserDao.findById(db, users.user.id)).email
            );
            expect(email).to.equal('other.email@engspace.test');
        });

        it('should let user set password', async () => {
            const res = await chai
                .request(app)
                .patch(`/api/users/${users.user.id}`)
                .set('Authorization', `Bearer ${tokens.user}`)
                .send({ password: 'new_password' });
            expect(res).to.have.status(HttpStatus.OK);
            expect(await checkPassword(users.user.id, 'new_password')).to.be
                .true;
        });

        it("shouldn't let user reset password to null", async () => {
            const res = await chai
                .request(app)
                .patch(`/api/users/${users.user.id}`)
                .set('Authorization', `Bearer ${tokens.user}`)
                .send({ password: null });
            expect(res).to.have.status(HttpStatus.FORBIDDEN);
        });

        it("shouldn't let admin set password", async () => {
            // TODO: send password reset email
            const res = await chai
                .request(app)
                .patch(`/api/users/${users.user.id}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({ password: 'new_password' });
            expect(res).to.have.status(HttpStatus.FORBIDDEN);
        });

        it('should let admin reset password to null', async () => {
            // TODO: send password reset email
            const res = await chai
                .request(app)
                .patch(`/api/users/${users.user.id}`)
                .set('Authorization', `Bearer ${tokens.admin}`)
                .send({ password: null });
            expect(res).to.have.status(HttpStatus.OK);
            const has = await Pool.connect(async db =>
                UserDao.hasPasswordById(db, users.user.id)
            );
            expect(has).to.be.true;
        });
    });
});

describe('First Admin', () => {
    describe('GET /api/first_admin', () => {
        after('clean up users', deleteUsers);

        it("should tell if admin doesn't exist", async () => {
            const res = await chai.request(app).get('/api/first_admin');
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body).to.deep.equal({ hasAdmin: false });
        });
        it('should tell if admin exists', async () => {
            await Pool.connect(db => createAdmin(db));
            const res = await chai.request(app).get('/api/first_admin');
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body).to.deep.equal({ hasAdmin: true });
        });
    });

    describe('POST /api/first_admin', () => {
        afterEach('clean up users', deleteUsers);

        it('should reject if admin exists', async () => {
            await Pool.connect(db => createAdmin(db));
            const res = await chai
                .request(app)
                .post('/api/first_admin')
                .send(userTemplates.user);
            expect(res).to.have.status(HttpStatus.FORBIDDEN);
        });

        it('should create first admin', async () => {
            const res = await chai
                .request(app)
                .post('/api/first_admin')
                .send(userTemplates.user);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            const result = res.body;
            const expected = {
                name: 'user',
                email: 'user@engspace.test',
                fullName: 'User Name',
                admin: true,
                manager: false,
            };
            expect(result).to.include(expected);
            const user = await Pool.connect(db =>
                UserDao.findByName(db, 'user')
            );
            expect(user).to.not.be.null;
            expect(user).to.include(expected);
        });

        it('should retain manager rights', async () => {
            const res = await chai
                .request(app)
                .post('/api/first_admin')
                .send(userTemplates.manager);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            const result = res.body;
            const expected = {
                name: 'manager',
                email: 'manager@engspace.test',
                fullName: 'Manager Name',
                admin: true,
                manager: true,
            };
            expect(result).to.include(expected);
            const user = await Pool.connect(db =>
                UserDao.findByName(db, 'manager')
            );
            expect(user).to.not.be.null;
            expect(user).to.include(expected);
        });
    });
});
