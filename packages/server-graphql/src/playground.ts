import { AppRolePolicies } from '@engspace/core';
import { DbPool, LoginDao } from '@engspace/server-db';
import Router from '@koa/router';
import { ApolloServer } from 'apollo-server-koa';
import config from 'config';
import HttpStatus from 'http-status-codes';
import Koa from 'koa';
import send from 'koa-send';
import session from 'koa-session';
import path from 'path';
import { signToken, verifyToken } from './auth';
import { attachDb, AUTH_TOKEN_SYMBOL, gqlContextFactory } from './internal';
import { resolvers } from './resolvers';
import { typeDefs } from './schema';

export function setupPlaygroundLogin(
    prefix: string,
    app: Koa,
    pool: DbPool,
    rolePolicies: AppRolePolicies
): void {
    app.keys = config.get<string[]>('sessionSigningKeys');
    app.use(session(app));

    const router = new Router({ prefix });

    router.get('/login', async ctx => {
        await send(ctx, 'playground-login.html', {
            root: path.normalize(path.join(__dirname, '../pages')),
        });
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
            return LoginDao.login(db, username, password);
        });
        if (user) {
            const perms = rolePolicies.user.permissions(user.roles);
            const token = await signToken({
                userId: user.id,
                userPerms: perms,
            });
            ctx.cookies.set('playground-token', token, { signed: true });
            return ctx.redirect(prefix);
        } else {
            ctx.throw(HttpStatus.UNAUTHORIZED);
        }
    });

    app.use(router.routes());
}

export function setupPlaygroundEndpoint(
    prefix: string,
    app: Koa,
    pool: DbPool,
    rolePolicies: AppRolePolicies
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
                (ctx.state as any)[AUTH_TOKEN_SYMBOL] = await verifyToken(token);
            } catch (err) {
                ctx.redirect(prefix + '/login?wrongCredentials=true');
                return;
            }
            return next();
        }
    );

    app.use(attachDb(pool, prefix));

    const playground = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: true,
        playground: {
            settings: {
                'request.credentials': 'same-origin',
            },
        },
        context: gqlContextFactory(rolePolicies),
    });

    app.use(
        playground.getMiddleware({
            path: prefix,
        })
    );
}
