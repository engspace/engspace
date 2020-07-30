import fs from 'fs';
import path from 'path';
import Router from '@koa/router';
import { ApolloServer } from 'apollo-server-koa';
import { GraphQLSchema } from 'graphql';
import HttpStatus from 'http-status-codes';
import Koa from 'koa';
import mime from 'mime';
import { AuthToken } from '@engspace/core';
import { passwordLogin } from '@engspace/server-db';
import { EsServerConfig, EsServerRuntime } from '../';
import { signJwt, verifyJwt } from '../crypto';
import { gqlContextFactory } from '../graphql/context';

/**
 * setup a login form at prefix/login for graphql playground authentification
 */
export function setupPlaygroundLogin(
    prefix: string,
    app: Koa,
    runtime: EsServerRuntime,
    config: EsServerConfig,
    jwtSecret: string
): void {
    const { pool } = runtime;
    const { rolePolicies } = config;

    const router = new Router({ prefix });

    router.get('/login', async (ctx) => {
        const htmlFile = path.normalize(path.join(__dirname, '../../pages/playground-login.html'));
        const stream = fs.createReadStream(htmlFile);
        ctx.set('Content-Disposition', 'inline');
        ctx.set('Content-Type', mime.getType('playground-login.html'));
        ctx.response.body = stream;
    });

    router.post('/login', async (ctx) => {
        const { username, password } = ctx.request.body;

        ctx.assert(
            typeof username === 'string' && typeof password === 'string',
            HttpStatus.BAD_REQUEST,
            "login needs 'nameOrEmail' and 'password' in the request body"
        );

        ctx.assert(
            username.length && password.length,
            HttpStatus.BAD_REQUEST,
            "'nameOrEmail' and 'password' cannot be empty"
        );

        const user = await pool.connect(async (db) => {
            return passwordLogin.login(db, username, password);
        });
        if (user) {
            const perms = rolePolicies.user.permissions(user.roles);
            const token = await signJwt(
                {
                    userId: user.id,
                    userPerms: perms,
                },
                jwtSecret,
                {
                    expiresIn: '12H',
                }
            );
            ctx.cookies.set('playground-token', token, { signed: true });
            return ctx.redirect(prefix);
        } else {
            ctx.throw(HttpStatus.UNAUTHORIZED);
        }
    });

    app.use(router.routes());
}

/**
 * Setup playground graphql endpoint
 */
export function setupPlaygroundEndpoint(
    prefix: string,
    schema: GraphQLSchema,
    app: Koa,
    config: EsServerConfig,
    jwtSecret: string
): void {
    app.use(
        async (ctx, next): Promise<void> => {
            if (ctx.path !== prefix) {
                return next();
            }
            const token = ctx.cookies.get('playground-token', { signed: true });
            if (!token) {
                ctx.redirect(prefix + '/login');
                return;
            }
            try {
                ctx.state.authToken = await verifyJwt<AuthToken>(token, jwtSecret);
            } catch (err) {
                ctx.redirect(prefix + '/login?wrongCredentials=true');
                return;
            }
            return next();
        }
    );

    const playground = new ApolloServer({
        schema,
        introspection: true,
        playground: {
            settings: {
                'request.credentials': 'same-origin',
            },
        },
        context: gqlContextFactory,
    });

    app.use(
        playground.getMiddleware({
            path: prefix,
        })
    );
}
