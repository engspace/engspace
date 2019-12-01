import { Request, Response } from 'express';
import HttpStatus from 'http-status-codes';
import { body } from 'express-validator';

import { Pool, UserDao } from '@engspace/server-db';

import { signToken, UserTokenInput } from './auth';
import { Route } from './routegen';

export const rootRoutes = {
    login: new Route({
        perms: [],
        method: 'POST',
        path: '/login',
        validation: [body('nameOrEmail').isString(), body('password').isString()],
        handler: (req: Request, res: Response): Promise<void> =>
            Pool.connect(async db => {
                const { nameOrEmail, password } = req.body;
                try {
                    const user = await UserDao.findByNameOrEmail(db, nameOrEmail);
                    const ok = await UserDao.checkPasswordById(db, user.id, password);
                    if (ok) {
                        res.json({
                            token: await signToken(user as UserTokenInput),
                        });
                    } else {
                        res.status(HttpStatus.FORBIDDEN).end();
                    }
                } catch (err) {
                    console.error(err);
                    res.status(HttpStatus.FORBIDDEN).end();
                }
            }),
    }),

    checkToken: new Route({
        auth: true,
        perms: [],
        method: 'GET',
        path: '/check_token',
        handler: async (req: Request, res: Response): Promise<void> =>
            res.status(HttpStatus.OK).end(),
    }),
};
