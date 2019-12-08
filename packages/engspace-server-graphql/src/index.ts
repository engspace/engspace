import Koa, { Context, Next } from 'koa';
import logger from 'koa-logger';
import bodyParser from 'koa-bodyparser';
import cors from 'koa2-cors';
import { ApolloServer } from 'apollo-server-koa';

import { Db, DbPool } from '@engspace/server-db';

import { loginRouter, checkAuth, userToken, UserToken } from './login';
import { setupPlayground } from './playground';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { GqlLoaders, makeLoaders } from './loaders';

export interface GqlContext {
    koaCtx: Koa.Context;
    user: UserToken;
    db: Db;
    loaders: GqlLoaders;
}

const DB_SYMBOL = Symbol('@engspace/engspace-graphql/db');

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

export function buildContext({ ctx }): GqlContext {
    const gqlCtx = {
        koaCtx: ctx,
        user: userToken(ctx),
        db: ctx.state[DB_SYMBOL],
        loaders: null,
    };
    gqlCtx.loaders = makeLoaders(gqlCtx);
    return gqlCtx;
}

export async function buildGqlApp(pool: DbPool): Promise<Koa> {
    const app = new Koa();
    app.use(logger());
    app.use(
        bodyParser({
            enableTypes: ['json', 'text', 'form'],
        })
    );
    app.use(
        cors({
            exposedHeaders: ['Total-Count'],
        })
    );

    setupPlayground(app, pool);

    const login = loginRouter(pool);
    app.use(login.routes());
    app.use(login.allowedMethods());

    app.use(checkAuth);
    app.use(attachDb(pool, '/graphql'));

    const graphQL = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: false,
        playground: false,
        context: buildContext,
    });
    app.use(
        graphQL.getMiddleware({
            path: '/graphql',
        })
    );

    setupPlayground(app, pool);

    return app;
}
