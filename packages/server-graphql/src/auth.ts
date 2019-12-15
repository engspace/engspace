import { getRolesPerms, Id, Role } from '@engspace/core';
import { DbPool, LoginDao, UserDao } from '@engspace/server-db';
import config from 'config';
import HttpStatus from 'http-status-codes';
import jwt from 'jsonwebtoken';
import Koa, { Context, Next } from 'koa';
import Router from 'koa-router';
import validator from 'validator';

export const AUTH_TOKEN_SYMBOL = Symbol('@engspace/server-graphql/authToken');

export interface AuthToken {
    userId: Id;
    userRoles: Role[];
    userPerms: string[];
}

export async function signToken(token: AuthToken): Promise<string> {
    const { userId, userRoles, userPerms } = token;
    return new Promise((resolve, reject) => {
        jwt.sign(
            {
                userId,
                userRoles,
                userPerms,
            },
            config.get<string>('jwtSecret'),
            {
                algorithm: 'HS256',
                expiresIn: '12h',
            },
            (err, encoded) => {
                if (err) reject(err);
                resolve(encoded);
            }
        );
    });
}

export async function verifyToken(token: string): Promise<AuthToken> {
    return new Promise((resolve, reject) => {
        jwt.verify(token, config.get<string>('jwtSecret'), (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded as AuthToken);
            }
        });
    });
}

export function setupAuth(app: Koa, pool: DbPool): void {
    const restRouter = new Router();

    restRouter.post('/auth/login', async (ctx, next) => {
        const { nameOrEmail, password } = ctx.request.body;

        ctx.assert(
            typeof nameOrEmail === 'string' && typeof password === 'string',
            HttpStatus.BAD_REQUEST,
            "login needs 'nameOrEmail' and 'password' in the request body"
        );

        ctx.assert(
            nameOrEmail.length && password.length,
            HttpStatus.BAD_REQUEST,
            "'nameOrEmail' and 'password' cannot be empty"
        );

        const user = await pool.connect(async db => {
            return LoginDao.login(db, nameOrEmail, password);
        });
        if (user) {
            const perms = getRolesPerms(user.roles);
            ctx.body = {
                token: await signToken({
                    userId: user.id,
                    userRoles: user.roles,
                    userPerms: perms,
                }),
            };
        } else {
            ctx.throw(HttpStatus.UNAUTHORIZED);
        }
    });

    restRouter.get('/auth/first_admin', async (ctx, next) => {
        const result = await pool.connect(db =>
            UserDao.search(db, {
                role: Role.Admin,
            })
        );
        ctx.response.body = {
            hasAdmin: result.count >= 1,
        };
    });

    restRouter.post('/auth/first_admin', async (ctx, next) => {
        await pool.transaction(async db => {
            const adminSearch = await UserDao.search(db, {
                role: Role.Admin,
            });
            ctx.assert(adminSearch.count >= 1, HttpStatus.FORBIDDEN);
            const { name, email, fullName, password } = ctx.request.body;
            ctx.assert(
                typeof name === 'string' && name.length > 0,
                HttpStatus.BAD_REQUEST,
                'empty name'
            );
            ctx.assert(validator.isEmail(email), HttpStatus.BAD_REQUEST, 'wrong email format');

            ctx.assert(
                typeof password === 'string' && password.length > 0,
                HttpStatus.BAD_REQUEST,
                'missing password'
            );

            const user = await UserDao.create(db, { name, email, fullName, roles: [Role.Admin] });
            await LoginDao.create(db, user.id, password);
            ctx.response.body = user;
        });
    });

    app.use(restRouter.routes());
    app.use(restRouter.allowedMethods());
    app.use(checkAuth);
    app.use(async (ctx, next) => {
        if (ctx.path === '/auth/check_token' && ctx.method === 'GET') {
            ctx.status = HttpStatus.OK;
        } else {
            await next();
        }
    });
}

export async function checkAuth(ctx: Context, next: Next): Promise<void> {
    const header = ctx.request.get('x-access-token') || ctx.request.get('authorization');
    if (header) {
        const token = header.startsWith('Bearer ') ? header.slice(7) : header;
        try {
            (ctx.state as any)[AUTH_TOKEN_SYMBOL] = await verifyToken(token);
        } catch (err) {
            console.error(err);
            ctx.throw(HttpStatus.FORBIDDEN);
        }
        return next();
    } else {
        ctx.throw(HttpStatus.UNAUTHORIZED);
    }
}

export function authToken(ctx: Context): AuthToken {
    const up = (ctx.state as any)[AUTH_TOKEN_SYMBOL];
    ctx.assert(up, HttpStatus.INTERNAL_SERVER_ERROR, 'userToken called without checkAuth');
    return up;
}
