import { LoginDao } from '@engspace/server-db';
import Router from '@koa/router';
import HttpStatus from 'http-status-codes';
import { EsServerConfig } from '..';
import { signToken } from '../auth';

export function setupLoginRoute(router: Router, config: EsServerConfig): void {
    const { pool, rolePolicies } = config;

    router.post('/login', async ctx => {
        const { nameOrEmail, password } = ctx.request.body;

        ctx.assert(
            typeof nameOrEmail === 'string' && typeof password === 'string',
            HttpStatus.BAD_REQUEST,
            "login needs 'nameOrEmail' and 'password' in the request body"
        );

        ctx.assert(
            nameOrEmail.length && password.length,
            HttpStatus.BAD_REQUEST,
            "'nameOrEmail' and 'password' cannot be empty"
        );

        const user = await pool.connect(async db => {
            return LoginDao.login(db, nameOrEmail, password);
        });
        if (user) {
            const perms = rolePolicies.user.permissions(user.roles);
            ctx.body = {
                token: await signToken({
                    userId: user.id,
                    userPerms: perms,
                }),
            };
        } else {
            ctx.throw(HttpStatus.UNAUTHORIZED);
        }
    });
}
