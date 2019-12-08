import Router from 'koa-router';
import HttpStatus from 'http-status-codes';
import jwt from 'jsonwebtoken';
import config from 'config';
import { getRolesPerms } from '@engspace/core';
import { DbPool, LoginDao, UserDao } from '@engspace/server-db';
import { Context, Next } from 'koa';
import { DatabasePoolType } from 'slonik';

export const USER_TOKEN_SYMBOL = Symbol('@engspace/server-graphql/userToken');

export interface UserToken {
    id: number;
    name: string;
    perms: string[];
}

export async function signToken(token: UserToken): Promise<string> {
    return new Promise((resolve, reject) => {
        jwt.sign(
            {
                id: token.id,
                name: token.name,
                perms: token.perms,
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

export async function verifyToken(token: string): Promise<UserToken> {
    return new Promise((resolve, reject) => {
        jwt.verify(token, config.get<string>('jwtSecret'), (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded as UserToken);
            }
        });
    });
}

export function loginRouter(pool: DatabasePoolType): Router {
    const router = new Router();
    router.post('/login', async (ctx, next) => {
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
                    ...user,
                    perms,
                }),
            };
        } else {
            ctx.throw(HttpStatus.UNAUTHORIZED);
        }
    });
    return router;
}

export async function checkAuth(ctx: Context, next: Next): Promise<void> {
    if (ctx.path !== '/graphql') {
        return next();
    }
    const header = ctx.request.get('x-access-token') || ctx.request.get('authorization');
    if (header) {
        const token = header.startsWith('Bearer ') ? header.slice(7) : header;
        try {
            (ctx.state as any)[USER_TOKEN_SYMBOL] = await verifyToken(token);
        } catch (err) {
            console.error(err);
            ctx.throw(HttpStatus.FORBIDDEN);
        }
        return next();
    } else {
        ctx.throw(HttpStatus.UNAUTHORIZED);
    }
}

export function userToken(ctx: Context): UserToken {
    const up = (ctx.state as any)[USER_TOKEN_SYMBOL];
    ctx.assert(up, HttpStatus.INTERNAL_SERVER_ERROR, 'userToken called without checkAuth');
    return up;
}
