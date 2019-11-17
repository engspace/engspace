import config from 'config';
import jwt from 'jsonwebtoken';
import HttpStatus from 'http-status-codes';
import { NextFunction, Request, Response } from 'express';

export interface UserTokenInput
{
    id: number;
    fullName: string;
    admin: boolean;
    manager: boolean;
}

export async function signToken(user: UserTokenInput): Promise<string> {
    return new Promise((resolve, reject) => {
        jwt.sign(
            {
                id: user.id,
                fullName: user.fullName,
                admin: user.admin,
                manager: user.manager,
            },
            config.get<string>('jwtSecret'),
            {
                algorithm: 'HS256',
                expiresIn: '12h',
            },
            (err, encoded) => {
                if (err) reject(err);
                resolve(encoded);
            },
        );
    });
}

async function checkToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    let tok = req.get('x-access-token') || req.get('authorization');
    if (tok) {
        if (tok.startsWith('Bearer ')) {
            tok = tok.slice(7);
        }
        jwt.verify(tok, config.get('jwtSecret'), (err, decoded) => {
            if (err) {
                res.status(HttpStatus.FORBIDDEN).end();
            } else {
                const obj = decoded as any;
                (req as any).user = {
                    id: obj.id,
                    admin: obj.admin,
                    manager: obj.manager,
                };
                next();
            }
        });
    } else {
        res.status(HttpStatus.UNAUTHORIZED).end();
    }
}

async function checkAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    const r = req as any;
    if (r.user && r.user.admin === true) {
        next();
    } else {
        res.status(HttpStatus.FORBIDDEN).end();
    }
}

async function checkManager(req: Request, res: Response, next: NextFunction): Promise<void> {
    const r = req as any;
    if (r.user && r.user.manager === true) {
        next();
    } else {
        res.status(HttpStatus.FORBIDDEN).end();
    }
}

export const auth = {
    user: checkToken,
    admin: [checkToken, checkAdmin],
    manager: [checkToken, checkManager],
};
