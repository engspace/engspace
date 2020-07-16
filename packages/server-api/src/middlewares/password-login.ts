import HttpStatus from 'http-status-codes';
import { Middleware } from 'koa';
import { passwordLogin } from '@engspace/server-db';
import { EsServerConfig } from '..';
import { signJwt } from '../crypto';
import { authJwtSecret } from '../internal';

export function passwordLoginMiddleware(config: EsServerConfig): Middleware {
    const { pool, rolePolicies } = config;

    return async (ctx) => {
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
            return passwordLogin.login(db, nameOrEmail, password);
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
    };
}
