import Koa, { Context } from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from 'koa2-cors';

import { loginRouter, checkAuth, userToken, UserToken } from './login';
import { ApolloServer } from 'apollo-server-koa';

import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { Db, DbPool } from '@engspace/server-db';

export interface GqlContext {
    koaCtx: Koa.Context;
    user: UserToken;
    db: Db;
}

export async function buildGqlApp(pool: DbPool): Promise<Koa> {
    const app = new Koa();
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

    const login = loginRouter(pool);

    app.use(login.routes());
    app.use(login.allowedMethods());

    app.use(checkAuth(pool));

    const GQL_PATH = '/graphql';
    const DB_SYMBOL = Symbol('@engspace//db');

    app.use(async (ctx, next) => {
        if (ctx.path === GQL_PATH || ctx.path === '/graphql/playground') {
            const attachAndCall = async (db: Db): Promise<void> => {
                (ctx.state as any)[DB_SYMBOL] = db;
                await next();
                delete (ctx.state as any)[DB_SYMBOL];
            };
            if (ctx.method === 'GET') {
                return pool.connect(attachAndCall);
            } else if (ctx.method === 'POST') {
                return pool.transaction(attachAndCall);
            } else {
                throw new Error(`unsupported HTTP method for graphql: ${ctx.method}`);
            }
        }
        return next();
    });

    const graphQL = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: false,
        playground: false,
        context: ({ ctx }): GqlContext => ({
            koaCtx: ctx,
            user: userToken(ctx),
            db: ctx.state[DB_SYMBOL],
        }),
    });

    const graphQLPlayground = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: true,
        playground: true,
        context: ({ ctx }): GqlContext => ({
            koaCtx: ctx,
            user: userToken(ctx),
            db: ctx.state[DB_SYMBOL],
        }),
    });

    app.use(
        graphQL.getMiddleware({
            path: GQL_PATH,
        })
    );

    app.use(
        graphQLPlayground.getMiddleware({
            path: '/graphql/playground',
        })
    );

    return app;
}
