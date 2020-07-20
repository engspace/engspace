import cors from '@koa/cors';
import HttpStatus from 'http-status-codes';
import { Middleware } from 'koa';
import bodyParser from 'koa-bodyparser';
import { AuthToken } from '@engspace/core';
import { verifyJwt } from '../crypto';
import { authJwtSecret, setAuthToken, getAuthToken } from '../internal';

export { documentMiddlewares } from './document';
export { firstAdminMiddleware } from './first-admin';
export { EsGraphQLConfig, graphQLMiddleware, buildTestGqlServer } from './graphql';
export { setupPlaygroundLogin } from './graphql-playground';
export { passwordLoginMiddleware } from './password-login';

/** Body-parser middleware suitable for Engspace */
export const bodyParserMiddleware = bodyParser({
    enableTypes: ['json', 'text', 'form'],
});

/** CORS middleware suitable for Engspace */
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

/**
 * Middleware that requires the presence and verification of an authorization token header.
 *
 * Throws UNAUTHORIZED if the header is not present
 * Throws FORBIDDEN if the header is set but token can't be verified.
 * If header is present and token verified, the authorization is set on the context and
 * next middleware is called.
 */
export const requireAuthMiddleware: Middleware = async (ctx, next) => {
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

/**
 * Middleware that checks the presence and verification of an authorization token header.
 *
 * If the header is present but token cannot be verified, FORBIDDEN is thrown.
 * If the header is present and token verified, it is added on ctx for next middlewares.
 * If the header is not present, next is called anyway.
 */
export const checkAuthMiddleware: Middleware = async (ctx, next) => {
    const header = ctx.request.get('x-access-token') || ctx.request.get('authorization');
    if (header) {
        const token = header.startsWith('Bearer ') ? header.slice(7) : header;
        try {
            const authToken = await verifyJwt<AuthToken>(token, authJwtSecret);
            setAuthToken(ctx, authToken);
        } catch (err) {
            ctx.throw(HttpStatus.FORBIDDEN);
        }
    }
    return next();
};

/**
 * Middleware that checks the presence and verification of an authorization token header.
 *
 * If the header is present but token cannot be verified, FORBIDDEN is thrown.
 * If the header is present and token verified, it is added on ctx for next middlewares.
 * If the header is not present, the default token is set and next is called.
 */
export function checkAuthOrDefaultMiddleware(defaultAuth: AuthToken): Middleware {
    return async (ctx, next) => {
        const header = ctx.request.get('x-access-token') || ctx.request.get('authorization');
        if (header) {
            const token = header.startsWith('Bearer ') ? header.slice(7) : header;
            try {
                const authToken = await verifyJwt<AuthToken>(token, authJwtSecret);
                setAuthToken(ctx, authToken);
            } catch (err) {
                ctx.throw(HttpStatus.FORBIDDEN);
            }
        } else {
            setAuthToken(ctx, defaultAuth);
        }
        return next();
    };
}

    const token = getAuthToken(ctx);
    if (!token) ctx.throw(HttpStatus.UNAUTHORIZED);
    ctx.status = HttpStatus.OK;
};
