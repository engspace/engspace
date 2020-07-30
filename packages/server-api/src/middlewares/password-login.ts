import HttpStatus from 'http-status-codes';
import { passwordLogin } from '@engspace/server-db';
import { signJwt } from '../crypto';
import { EsKoaMiddleware } from '../es-koa';

export function passwordLoginMiddleware(jwtSecret: string): EsKoaMiddleware {
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

        const { db } = ctx.state;
        const { rolePolicies } = ctx.config;

        const user = await passwordLogin.login(db, nameOrEmail, password);
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
            ctx.body = { token };
        } else {
            ctx.throw(HttpStatus.FORBIDDEN);
        }
    };
}
