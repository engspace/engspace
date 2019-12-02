import chai from 'chai';
import HttpStatus from 'http-status-codes';
import { CommonQueryMethodsType, sql } from 'slonik';

import { Role, User } from '@engspace/core';
import { createUsers, prepareUsersWithPswd } from '@engspace/demo-data';
import { Pool, UserDao } from '@engspace/server-db';
import { app } from '../src';
import { userTokens, UserSet, UsersAndTokens, loginToken } from './auth';

const { expect } = chai;

export const createUserSet = async (): Promise<UserSet> =>
    Pool.connect(async (db: CommonQueryMethodsType) => {
        const users = await createUsers(db);
        const userSet: UserSet = {};
        for (const u of users) {
            userSet[u.name] = u;
        }
        return userSet;
    });

export const prepareUserSet = (): UserSet => {
    const users = prepareUsersWithPswd();
    const userSet = {};
    for (const u of users) {
        userSet[u.name] = u;
    }
    return userSet;
};

export const deleteUsers = async (): Promise<void> => Pool.connect(db => UserDao.deleteAll(db));

export const usersAndTokens = async (): Promise<UsersAndTokens> => {
    const users = await createUserSet();
    const tokens = await userTokens(users);
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

// const checkPassword = async (id: number, password: string): Promise<boolean> =>
//     Pool.connect(async db => {
//         const ok = await db.oneFirst(sql`
//             SELECT (password = crypt(${password}, password)) as ok
//             FROM "user" WHERE id = ${id}
//         `);
//         return (ok as unknown) as boolean;
//     });

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
                .set('Authorization', `Bearer ${tokens.philippe}`);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body)
                .to.be.an('array')
                .of.lengthOf(Object.keys(users).length);
            expect(res.body).to.deep.include(users.ambre);
            expect(res.body).to.deep.include(users.pascal);
            expect(res.body).to.deep.include(users.gerard);
        });

        it('should get only admin', async () => {
            const res = await chai
                .request(app)
                .get('/api/users')
                .query({ role: Role.Admin })
                .set('Authorization', `Bearer ${tokens.pascal}`);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body)
                .to.be.an('array')
                .of.lengthOf(1)
                .that.deep.include(users.gerard);
        });

        it('should get only manager', async () => {
            const res = await chai
                .request(app)
                .get('/api/users')
                .query({ role: Role.Manager } as object)
                .set('Authorization', `Bearer ${tokens.sophie}`);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body)
                .to.be.an('array')
                .of.lengthOf(1)
                .that.deep.include(users.ambre);
        });

        it('should find only Fatima', async () => {
            const res = await chai
                .request(app)
                .get('/api/users')
                .query({ phrase: 'fatim' } as object)
                .set('Authorization', `Bearer ${tokens.philippe}`);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body)
                .to.be.an('array')
                .of.lengthOf(1)
                .that.deep.include(users.fatima);
        });

        it('should not find anyone', async () => {
            const res = await chai
                .request(app)
                .get('/api/users')
                .query({ phrase: 'nobody' } as object)
                .set('Authorization', `Bearer ${tokens.fatima}`);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body)
                .to.be.an('array')
                .of.lengthOf(0);
        });
    });

    describe('POST /api/users', () => {
        const users = prepareUserSet();
        let gerardTok: any;
        let ambreTok: any;
        before('create admin and manager and fetch tokens', async () => {
            await Pool.connect(async db => {
                const gerard = await UserDao.create(db, users.gerard);
                const ambre = await UserDao.create(db, users.ambre);
                [gerardTok, ambreTok] = await Promise.all([loginToken(gerard), loginToken(ambre)]);
            });
        });

        after('clean up users', deleteUsers);

        it('should reject unauthorized access', async () => {
            const res = await chai
                .request(app)
                .post('/api/users')
                .send(users.philippe);
            expect(res).to.have.status(HttpStatus.UNAUTHORIZED);
        });

        it('should reject non-admin access', async () => {
            const res = await chai
                .request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${ambreTok}`)
                .send(users.philippe);
            expect(res).to.have.status(HttpStatus.FORBIDDEN);
        });

        it('should create user', async () => {
            const res = await chai
                .request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${gerardTok}`)
                .send(users.philippe);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            const result = res.body;
            expect(result).to.deep.include(filterField(users.philippe, 'password'));
            const user = await Pool.connect(db => UserDao.findById(db, result.id));
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
                .patch(`/api/users/${users.sophie.id}`)
                .send(emailUpdate);
            expect(res).to.have.status(HttpStatus.UNAUTHORIZED);
        });

        it('should reject non-admin and foreign user', async () => {
            const res = await chai
                .request(app)
                .patch(`/api/users/${users.sophie.id}`)
                .set('Authorization', `Bearer ${tokens.ambre}`)
                .send(emailUpdate);
            expect(res).to.have.status(HttpStatus.FORBIDDEN);
        });

        it('should update with admin access', async () => {
            const res = await chai
                .request(app)
                .patch(`/api/users/${users.sophie.id}`)
                .set('Authorization', `Bearer ${tokens.gerard}`)
                .send(emailUpdate);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body).to.include({
                name: 'sophie',
                email: 'other.email@engspace.test',
            });
            const email = await Pool.connect(
                async db => (await UserDao.findById(db, users.sophie.id)).email
            );
            expect(email).to.equal('other.email@engspace.test');
        });

        it('should update with same user access', async () => {
            const res = await chai
                .request(app)
                .patch(`/api/users/${users.sophie.id}`)
                .set('Authorization', `Bearer ${tokens.sophie}`)
                .send(emailUpdate);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body).to.include({
                name: 'sophie',
                email: 'other.email@engspace.test',
            });
            const email = await Pool.connect(
                async db => (await UserDao.findById(db, users.sophie.id)).email
            );
            expect(email).to.equal('other.email@engspace.test');
        });

        //     it('should let user set password', async () => {
        //         const res = await chai
        //             .request(app)
        //             .patch(`/api/users/${users.sophie.id}`)
        //             .set('Authorization', `Bearer ${tokens.sophie}`)
        //             .send({ password: 'new_password' });
        //         expect(res).to.have.status(HttpStatus.OK);
        //         expect(await checkPassword(users.sophie.id, 'new_password')).to.be.true;
        //     });

        //     it("shouldn't let user reset password to null", async () => {
        //         const res = await chai
        //             .request(app)
        //             .patch(`/api/users/${users.user.id}`)
        //             .set('Authorization', `Bearer ${tokens.user}`)
        //             .send({ password: null });
        //         expect(res).to.have.status(HttpStatus.FORBIDDEN);
        //     });

        //     it("shouldn't let admin set password", async () => {
        //         // TODO: send password reset email
        //         const res = await chai
        //             .request(app)
        //             .patch(`/api/users/${users.user.id}`)
        //             .set('Authorization', `Bearer ${tokens.admin}`)
        //             .send({ password: 'new_password' });
        //         expect(res).to.have.status(HttpStatus.FORBIDDEN);
        //     });

        //     it('should let admin reset password to null', async () => {
        //         // TODO: send password reset email
        //         const res = await chai
        //             .request(app)
        //             .patch(`/api/users/${users.user.id}`)
        //             .set('Authorization', `Bearer ${tokens.admin}`)
        //             .send({ password: null });
        //         expect(res).to.have.status(HttpStatus.OK);
        //         const has = await Pool.connect(async db => UserDao.hasPasswordById(db, users.user.id));
        //         expect(has).to.be.true;
        //     });
    });
});

describe('First Admin', () => {
    const users = prepareUserSet();

    describe('GET /api/first_admin', () => {
        after('clean up users', deleteUsers);

        it("should tell if admin doesn't exist", async () => {
            const res = await chai.request(app).get('/api/first_admin');
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body).to.deep.equal({ hasAdmin: false });
        });
        it('should tell if admin exists', async () => {
            await Pool.connect(db => UserDao.create(db, users.gerard));
            const res = await chai.request(app).get('/api/first_admin');
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            expect(res.body).to.deep.equal({ hasAdmin: true });
        });
    });

    describe('POST /api/first_admin', () => {
        afterEach('clean up users', deleteUsers);

        it('should reject if admin exists', async () => {
            await Pool.connect(db => UserDao.create(db, users.gerard));
            const res = await chai
                .request(app)
                .post('/api/first_admin')
                .send(users.philippe);
            expect(res).to.have.status(HttpStatus.FORBIDDEN);
        });

        it('should create first admin', async () => {
            const res = await chai
                .request(app)
                .post('/api/first_admin')
                .send(users.philippe);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            const result = res.body;
            const philippe = new User({
                ...users.philippe,
                roles: users.philippe.roles.concat(Role.Admin),
            });
            const expected = filterField(philippe, 'password');
            expect(result).to.deep.include(expected);
            const user = await Pool.connect(db => UserDao.findByName(db, 'philippe'));
            expect(user).to.not.be.null;
            expect(user).to.deep.include(expected);
        });

        it('should retain manager rights', async () => {
            const res = await chai
                .request(app)
                .post('/api/first_admin')
                .send(users.ambre);
            expect(res).to.have.status(HttpStatus.OK);
            expect(res).to.have.property('body');
            const result = res.body;
            const ambre = new User({
                ...users.ambre,
                roles: users.ambre.roles.concat(Role.Admin),
            });
            const expected = filterField(ambre, 'password');
            expect(result).to.deep.include(expected);
            const user = await Pool.connect(db => UserDao.findByName(db, 'ambre'));
            expect(user).to.not.be.null;
            expect(user).to.deep.include(expected);
        });
    });
});
