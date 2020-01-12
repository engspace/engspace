import { AuthToken } from '@engspace/core';
import { Db, DbPool } from '@engspace/server-db';
import HttpStatus from 'http-status-codes';
import { Context, DefaultContext, Next } from 'koa';

const DB_SYMBOL = Symbol('@engspace/server-api/db');
const AUTH_TOKEN_SYMBOL = Symbol('@engspace/server-api/authToken');

export function attachDb(pool: DbPool, path: string) {
    return async (ctx: Context, next: Next): Promise<void> => {
        if (ctx.path !== path) {
            return next();
        }
        const attachAndCallNext = async (db: Db): Promise<void> => {
            (ctx.state as any)[DB_SYMBOL] = db;
            await next();
            delete (ctx.state as any)[DB_SYMBOL];
        };
        if (ctx.method === 'GET') {
            return pool.connect(attachAndCallNext);
        } else if (ctx.method === 'POST') {
            return pool.transaction(attachAndCallNext);
        } else {
            throw new Error(`unsupported HTTP method for graphql: ${ctx.method}`);
        }
    };
}

export function getDb(ctx: DefaultContext): Db {
    const db = (ctx.state as any)[DB_SYMBOL];
    ctx.assert(db, HttpStatus.INTERNAL_SERVER_ERROR, 'getDb unsuccessful');
    return db;
}

export function setAuthToken(ctx: DefaultContext, token: AuthToken): void {
    (ctx.state as any)[AUTH_TOKEN_SYMBOL] = token;
}

export function getAuthToken(ctx: DefaultContext): AuthToken {
    const up = (ctx.state as any)[AUTH_TOKEN_SYMBOL];
    ctx.assert(up, HttpStatus.INTERNAL_SERVER_ERROR, 'getAuthToken unsuccessful');
    return up;
}
