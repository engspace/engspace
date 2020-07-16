import cors from '@koa/cors';
import HttpStatus from 'http-status-codes';
import { Middleware } from 'koa';
import bodyParser from 'koa-bodyparser';
import { AuthToken } from '@engspace/core';
import { verifyJwt } from '../crypto';
import { authJwtSecret, setAuthToken } from '../internal';

export { documentMiddlewares } from './document';
export { firstAdminMiddleware } from './first-admin';
export { EsGraphQLConfig, graphQLMiddleware, buildTestGqlServer } from './graphql';
export { setupPlaygroundLogin } from './graphql-playground';
export { passwordLoginMiddleware } from './password-login';

export const bodyParserMiddleware = bodyParser({
    enableTypes: ['json', 'text', 'form'],
});

export const corsMiddleware = cors({
    keepHeadersOnError: true,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: [
        'Authorization',
        'Content-Length',
        'Content-Type',
        'X-Upload-Length',
        'X-Upload-Offset',
    ],
});

export const authCheckMiddleware: Middleware = async (ctx, next) => {
    const header = ctx.request.get('x-access-token') || ctx.request.get('authorization');
    if (header) {
        const token = header.startsWith('Bearer ') ? header.slice(7) : header;
        try {
            const authToken = await verifyJwt<AuthToken>(token, authJwtSecret);
            setAuthToken(ctx, authToken);
        } catch (err) {
            ctx.throw(HttpStatus.FORBIDDEN);
        }
        return next();
    } else {
        ctx.throw(HttpStatus.UNAUTHORIZED);
    }
};

export const checkTokenMiddleware: Middleware = async (ctx) => {
    ctx.status = HttpStatus.OK;
};
