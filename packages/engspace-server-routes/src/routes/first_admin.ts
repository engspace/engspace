import { Request, Response } from 'express';
import HttpStatus from 'http-status-codes';
import { Pool, UserDao } from '@engspace/server-db';

import { userRoutes } from './user';
import { Route } from './routegen';

export const firstAdminRoutes = {
    check: new Route({
        auth: 'NONE',
        method: 'GET',
        path: '/',
        handler: (req: Request, res: Response): Promise<Response> => Pool.connect(async db => res.json({
            hasAdmin: await UserDao.adminRegistered(db),
        })),
    }),

    register: new Route({
        auth: 'NONE',
        method: 'POST',
        path: '/',
        validation: userRoutes.create.validation,
        handler: (req: Request, res: Response): Promise<void> => Pool.connect(async (db) => {
            const hasAdmin = await UserDao.adminRegistered(db);
            if (hasAdmin) {
                res.status(HttpStatus.FORBIDDEN).end();
                return;
            }
            req.body.admin = true;
            const user = await UserDao.create(db, req.body);
            res.json(user);
        }),
    }),
};
