import { AuthToken } from '@engspace/core';
import { Db, DbPool } from '@engspace/server-db';
import cors from '@koa/cors';
import { ApolloLogExtension } from 'apollo-log';
import { ApolloServer } from 'apollo-server-koa';
import Koa, { Context, Next } from 'koa';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import { authToken, setupAuth } from './auth';
import { GqlLoaders, makeLoaders } from './loaders';
import { setupPlayground } from './playground';
import { resolvers } from './resolvers';
import { typeDefs } from './schema';

export interface GqlContext {
    koaCtx: Koa.Context;
    auth: AuthToken;
    db: Db;
    loaders: GqlLoaders;
}

const DB_SYMBOL = Symbol('@engspace/server-graphql/db');

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
        auth: authToken(ctx),
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
            keepHeadersOnError: true,
        })
    );

    setupPlayground(app, pool);

    setupAuth(app, pool);

    app.use(attachDb(pool, '/graphql'));

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const extensions = [() => new ApolloLogExtension()];

    const graphQL = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: false,
        playground: false,
        extensions,
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
