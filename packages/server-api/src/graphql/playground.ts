import { AuthToken } from '@engspace/core';
import { loginDao } from '@engspace/server-db';
import Router from '@koa/router';
import { ApolloServer } from 'apollo-server-koa';
import fs from 'fs';
import mime from 'mime';
import HttpStatus from 'http-status-codes';
import Koa from 'koa';
import session from 'koa-session';
import path from 'path';
import { EsServerConfig } from '../';
import { signJwt, verifyJwt } from '../crypto';
import { attachDb, authJwtSecret, setAuthToken } from '../internal';
import { gqlContextFactory } from './context';
import { resolvers } from './resolvers';
import { typeDefs } from './schema';

export function setupPlaygroundLogin(prefix: string, app: Koa, esConfig: EsServerConfig): void {
    app.keys = esConfig.sessionKeys;
    app.use(session(app));

    const { rolePolicies, pool } = esConfig;

    const router = new Router({ prefix });

    router.get('/login', async ctx => {
        const htmlFile = path.normalize(path.join(__dirname, '../../pages/playground-login.html'));
        const stream = fs.createReadStream(htmlFile);
        ctx.set('Content-Disposition', 'inline');
        ctx.set('Content-Type', mime.getType('playground-login.html'));
        ctx.response.body = stream;
    });

    router.post('/login', async ctx => {
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

        const user = await pool.connect(async db => {
            return loginDao.login(db, username, password);
        });
        if (user) {
            const perms = rolePolicies.user.permissions(user.roles);
            const token = await signJwt(
                {
                    userId: user.id,
                    userPerms: perms,
                },
                authJwtSecret,
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

export function setupPlaygroundEndpoint(prefix: string, app: Koa, config: EsServerConfig): void {
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
                const authToken = await verifyJwt<AuthToken>(token, authJwtSecret);
                setAuthToken(ctx, authToken);
            } catch (err) {
                ctx.redirect(prefix + '/login?wrongCredentials=true');
                return;
            }
            return next();
        }
    );

    app.use(attachDb(config.pool, prefix));

    const playground = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: true,
        playground: {
            settings: {
                'request.credentials': 'same-origin',
            },
        },
        context: gqlContextFactory(config),
    });

    app.use(
        playground.getMiddleware({
            path: prefix,
        })
    );
}
