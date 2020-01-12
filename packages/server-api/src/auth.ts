import { AuthToken } from '@engspace/core';
import crypto from 'crypto';
import HttpStatus from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { Context, Next } from 'koa';
import { setAuthToken } from './internal';

const jwtSecret = crypto.randomBytes(32).toString('base64');

export async function signToken(token: AuthToken): Promise<string> {
    const { userId, userPerms } = token;
    return new Promise((resolve, reject) => {
        jwt.sign(
            {
                userId,
                userPerms,
            },
            jwtSecret,
            {
                algorithm: 'HS256',
                expiresIn: '12h',
            },
            (err, encoded) => {
                if (err) reject(err);
                resolve(encoded);
            }
        );
    });
}

export async function verifyToken(token: string): Promise<AuthToken> {
    return new Promise((resolve, reject) => {
        jwt.verify(token, jwtSecret, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded as AuthToken);
            }
        });
    });
}

export async function checkAuth(ctx: Context, next: Next): Promise<void> {
    const header = ctx.request.get('x-access-token') || ctx.request.get('authorization');
    if (header) {
        const token = header.startsWith('Bearer ') ? header.slice(7) : header;
        try {
            const authToken = await verifyToken(token);
            setAuthToken(ctx, authToken);
        } catch (err) {
            console.error(err);
            ctx.throw(HttpStatus.FORBIDDEN);
        }
        return next();
    } else {
        ctx.throw(HttpStatus.UNAUTHORIZED);
    }
}
