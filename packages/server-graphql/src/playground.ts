import path from 'path';
import Koa from 'koa';
import Router from 'koa-router';
import send from 'koa-send';
import session from 'koa-session';
import config from 'config';
import HttpStatus from 'http-status-codes';
import { ApolloServer } from 'apollo-server-koa';
import { getRolesPerms } from '@engspace/core';
import { DbPool, LoginDao } from '@engspace/server-db';
import { signToken, verifyToken, USER_TOKEN_SYMBOL } from './login';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { buildContext, attachDb } from '.';

export function setupPlayground(app: Koa, pool: DbPool): void {
    app.keys = config.get<string[]>('sessionSigningKeys');
    app.use(session(app));

    const router = new Router();

    router.get('/graphql/playground/login', async (ctx, next) => {
        await send(ctx, 'playground-login.html', {
            root: path.normalize(path.join(__dirname, '../pages')),
        });
    });

    router.post('/graphql/playground/login', async (ctx, next) => {
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
            const token = await signToken({ ...user, perms });
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
                (ctx.state as any)[USER_TOKEN_SYMBOL] = await verifyToken(token);
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
