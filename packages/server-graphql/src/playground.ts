import { getRolesPerms } from '@engspace/core';
import { DbPool, LoginDao } from '@engspace/server-db';
import Router from '@koa/router';
import { ApolloServer } from 'apollo-server-koa';
import config from 'config';
import HttpStatus from 'http-status-codes';
import Koa from 'koa';
import send from 'koa-send';
import session from 'koa-session';
import path from 'path';
import { attachDb, buildContext } from '.';
import { AUTH_TOKEN_SYMBOL, signToken, verifyToken } from './auth';
import { resolvers } from './resolvers';
import { typeDefs } from './schema';

export function setupPlayground(app: Koa, pool: DbPool): void {
    app.keys = config.get<string[]>('sessionSigningKeys');
    app.use(session(app));

    const router = new Router();

    router.get('/graphql/playground/login', async ctx => {
        await send(ctx, 'playground-login.html', {
            root: path.normalize(path.join(__dirname, '../pages')),
        });
    });

    router.post('/graphql/playground/login', async ctx => {
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
            return LoginDao.login(db, username, password);
        });
        if (user) {
            const perms = getRolesPerms(user.roles);
            const token = await signToken({
                userId: user.id,
                userPerms: perms,
            });
            ctx.cookies.set('playground-token', token, { signed: true });
            return ctx.redirect('/graphql/playground');
        } else {
            ctx.throw(HttpStatus.UNAUTHORIZED);
        }
    });

    app.use(router.routes());
    app.use(router.allowedMethods());

    app.use(
        async (ctx, next): Promise<void> => {
            if (ctx.path !== '/graphql/playground') {
                return next();
            }
            const token = ctx.cookies.get('playground-token', { signed: true });
            if (!token) {
                ctx.redirect('/graphql/playground/login');
                return;
            }
            try {
                (ctx.state as any)[AUTH_TOKEN_SYMBOL] = await verifyToken(token);
            } catch (err) {
                ctx.redirect('/graphql/playground/login?wrongCredentials=true');
                return;
            }
            return next();
        }
    );

    app.use(attachDb(pool, '/graphql/playground'));

    const playground = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: true,
        playground: {
            settings: {
                'request.credentials': 'same-origin',
            },
        },
        context: buildContext,
    });

    app.use(
        playground.getMiddleware({
            path: '/graphql/playground',
        })
    );
}
