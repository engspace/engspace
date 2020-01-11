import { AppRolePolicies, AuthToken } from '@engspace/core';
import { Db, DbPool } from '@engspace/server-db';
import Koa, { Context, Next } from 'koa';
import { authToken } from './auth';
import { GqlLoaders, makeLoaders } from './loaders';

const DB_SYMBOL = Symbol('@engspace/server-api/db');
export const AUTH_TOKEN_SYMBOL = Symbol('@engspace/server-api/authToken');

export interface GqlContext {
    koaCtx: Koa.Context;
    auth: AuthToken;
    rolePolicies: AppRolePolicies;
    db: Db;
    loaders: GqlLoaders;
}

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

export interface HasKoaContext {
    ctx: Koa.Context;
}

export interface GqlContextFactory {
    (obj: HasKoaContext): GqlContext;
}

export function gqlContextFactory(rolePolicies: AppRolePolicies): GqlContextFactory {
    return ({ ctx }): GqlContext => {
        const gqlCtx = {
            koaCtx: ctx,
            auth: authToken(ctx),
            rolePolicies,
            db: (ctx.state as any)[DB_SYMBOL],
            loaders: null,
        };
        gqlCtx.loaders = makeLoaders(gqlCtx);
        return gqlCtx;
    };
}
