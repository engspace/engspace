import { AppRolePolicies, AuthToken } from '@engspace/core';
import { DbPool } from '@engspace/server-db';
import cors from '@koa/cors';
import Router from '@koa/router';
import { ApolloLogExtension } from 'apollo-log';
import { ApolloServer } from 'apollo-server-koa';
import fs from 'fs';
import HttpStatus from 'http-status-codes';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { verifyJwt } from './crypto';
import { gqlContextFactory } from './graphql/context';
import { setupPlaygroundEndpoint, setupPlaygroundLogin } from './graphql/playground';
import { resolvers } from './graphql/resolvers';
import { typeDefs } from './graphql/schema';
import { setupDocRoutes, setupDocTokenRoutes } from './http/document';
import { setupFirstAdminRoutes } from './http/first_admin';
import { setupLoginRoute } from './http/login';
import { attachDb, authJwtSecret, setAuthToken } from './internal';

export interface EsServerConfig {
    rolePolicies: AppRolePolicies;
    storePath: string;
    pool: DbPool;
    cors: boolean;
}

export class EsServerApi {
    constructor(public koa: Koa, public config: EsServerConfig) {
        fs.mkdir(config.storePath, { recursive: true }, err => {});
        koa.use(
            bodyParser({
                enableTypes: ['json', 'text', 'form'],
            })
        );
        if (config.cors) {
            koa.use(
                cors({
                    keepHeadersOnError: true,
                })
            );
        }
    }

    setupPlayground(): void {
        setupPlaygroundLogin('/graphql-playground', this.koa, this.config);
        setupPlaygroundEndpoint('/graphql-playground', this.koa, this.config);
    }

    setupPreAuthHttpRoutes(prefix: string): void {
        const router = new Router({ prefix });
        setupLoginRoute(router, this.config);
        setupFirstAdminRoutes(router, this.config);
        setupDocRoutes(router, this.config);
        this.koa.use(router.routes());
    }

    setupAuthCheck(): void {
        this.koa.use(async (ctx, next) => {
            const header = ctx.request.get('x-access-token') || ctx.request.get('authorization');
            if (header) {
                const token = header.startsWith('Bearer ') ? header.slice(7) : header;
                try {
                    const authToken = await verifyJwt<AuthToken>(token, authJwtSecret);
                    setAuthToken(ctx, authToken);
                } catch (err) {
                    console.error(err);
                    ctx.throw(HttpStatus.FORBIDDEN);
                }
                return next();
            } else {
                ctx.throw(HttpStatus.UNAUTHORIZED);
            }
        });
    }

    setupPostAuthHttpRoutes(prefix: string): void {
        const router = new Router({ prefix });
        router.get('/check_token', async ctx => {
            ctx.status = HttpStatus.OK;
        });
        setupDocTokenRoutes(router);
        this.koa.use(router.routes());
    }

    setupAuthAndHttpRoutes(prefix: string): void {
        this.setupPreAuthHttpRoutes(prefix);
        this.setupAuthCheck();
        this.setupPostAuthHttpRoutes(prefix);
    }

    setupGqlEndpoint(prefix: string): void {
        this.koa.use(attachDb(this.config.pool, prefix));
        const extensions = [(): ApolloLogExtension => new ApolloLogExtension()];
        const graphQL = new ApolloServer({
            typeDefs,
            resolvers,
            introspection: false,
            playground: false,
            extensions,
            formatError(err): Error {
                console.log(err);
                return err;
            },
            context: gqlContextFactory(this.config),
        });
        this.koa.use(
            graphQL.getMiddleware({
                path: prefix,
            })
        );
    }
}
