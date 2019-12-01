import config from 'config';
import jwt from 'jsonwebtoken';
import HttpStatus from 'http-status-codes';
import { RequestHandler } from 'express';
import { NextFunction, Request, Response } from 'express';
import { Role, getRolesPerms } from '@engspace/core';

export const UserReqSymbol = Symbol('@engspace/routes/user-req');

export interface UserTokenInput {
    id: number;
    name: string;
    fullName: string;
    roles: Role[];
}

export async function signToken(user: UserTokenInput): Promise<string> {
    return new Promise((resolve, reject) => {
        jwt.sign(
            {
                id: user.id,
                name: user.name,
                fullName: user.fullName,
                roles: user.roles,
            },
            config.get<string>('jwtSecret'),
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

export async function checkToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    let tok = req.get('x-access-token') || req.get('authorization');
    if (tok) {
        if (tok.startsWith('Bearer ')) {
            tok = tok.slice(7);
        }
        jwt.verify(tok, config.get('jwtSecret'), (err, decoded) => {
            if (err) {
                console.log('could not verify token');
                res.status(HttpStatus.FORBIDDEN).end();
            } else {
                const obj = decoded as UserTokenInput;
                // eslint-disable-next-line no-param-reassign
                req[UserReqSymbol] = {
                    id: obj.id,
                    name: obj.name,
                    roles: obj.roles,
                };
                next();
            }
        });
    } else {
        res.status(HttpStatus.UNAUTHORIZED).end();
    }
}

export function checkPerms(perms: string[]): RequestHandler {
    perms = perms.sort();
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const user: UserTokenInput = req[UserReqSymbol];
        if (user) {
            const userPerms = getRolesPerms(user.roles).sort();
            let ind = 0;
            for (const p of perms) {
                ind = userPerms.indexOf(p, ind);
                if (ind == -1) {
                    res.status(HttpStatus.FORBIDDEN).end();
                    return;
                }
            }
            next();
        } else {
            res.status(HttpStatus.FORBIDDEN).end();
        }
    };
}
