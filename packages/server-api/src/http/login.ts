import Router from '@koa/router';
import HttpStatus from 'http-status-codes';
import { EsServerConfig } from '..';
import { signJwt } from '../crypto';
import { authJwtSecret } from '../internal';

export function setupLoginRoute(router: Router, config: EsServerConfig): void {
    const { pool, rolePolicies, dao } = config;

    router.post('/login', async (ctx) => {
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

        const user = await pool.connect(async (db) => {
            return dao.login.login(db, nameOrEmail, password);
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
            ctx.body = { token };
        } else {
            ctx.throw(HttpStatus.FORBIDDEN);
        }
    });
}
