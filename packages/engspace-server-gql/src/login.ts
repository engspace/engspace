import Router from 'koa-router';
import HttpStatus from 'http-status-codes';
import jwt from 'jsonwebtoken';
import config from 'config';
import { getRolesPerms } from '@engspace/core';
import { Pool, UserDao } from '@engspace/server-db';
import { Context } from 'mocha';
import { Next } from 'koa';

export interface UserAndPerms {
    id: number;
    name: string;
    fullName: string;
    perms: string[];
}

async function signToken(user: UserAndPerms): Promise<string> {
    return new Promise((resolve, reject) => {
        jwt.sign(
            {
                id: user.id,
                name: user.name,
                fullName: user.fullName,
                perms: user.perms,
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

async function verifyToken(token: string): Promise<UserAndPerms> {
    return new Promise((resolve, reject) => {
        jwt.verify(token, config.get<string>('jwtSecret'), (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded as UserAndPerms);
            }
        });
    });
}

export const loginRouter = new Router();
loginRouter.post('login', async (ctx, next) => {
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

    const user = await Pool.connect(async db => {
        return UserDao.checkLogin(db, nameOrEmail, password);
    });
    if (user) {
        const perms = getRolesPerms(user.roles);
        ctx.body = {
            token: await signToken({
                ...user,
                perms,
            }),
        };
        await next();
    } else {
        ctx.throw(HttpStatus.UNAUTHORIZED);
    }
});

export async function checkAuth(ctx: Context, next: Next): Promise<void> {
    const header = ctx.request.get('x-access-token') || ctx.request.get('authorization');
    if (header) {
        const token = header.startsWith('Bearer ') ? header.slice(7) : header;
        try {
            ctx.state.userAndPerms = await verifyToken(token);
        } catch (err) {
            console.error(err);
            ctx.throw(HttpStatus.FORBIDDEN);
        }
        await next();
    } else {
        ctx.throw(HttpStatus.UNAUTHORIZED);
    }
}

export function userAndPerms(ctx: Context): UserAndPerms {
    const up = ctx.state.userAndPerms;
    ctx.assert(up, HttpStatus.INTERNAL_SERVER_ERROR, 'userAndPerms called without checkAuth');
    return up;
}
