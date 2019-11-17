import { Request, Response } from 'express';
import HttpStatus from 'http-status-codes';

import { userRoutes } from './user';
import { Route } from './routegen';
import { Pool } from '../../db';
import { UserDao } from '../../db/dao';

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
        handler: (req: Request, res: Response): Promise<Response> => Pool.connect(async (db) => {
            const hasAdmin = await UserDao.adminRegistered(db);
            if (hasAdmin) {
                return res.status(HttpStatus.FORBIDDEN).end();
            }
            req.body.admin = true;
            const user = await UserDao.create(db, req.body);
            return res.json(user);
        }),
    }),
};
