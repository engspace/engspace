import { Request, Response } from 'express';
import HttpStatus from 'http-status-codes';
import { Pool, UserDao } from '@engspace/server-db';
import { IUser, Role, User } from '@engspace/core';

import { Route } from './routegen';
import { engspaceBodyValidator } from '../validation';

export const firstAdminRoutes = {
    check: new Route({
        auth: false,
        perms: [],
        method: 'GET',
        path: '/',
        handler: (req: Request, res: Response): Promise<Response> =>
            Pool.connect(async db =>
                res.json({
                    hasAdmin: await UserDao.adminRegistered(db),
                })
            ),
    }),

    register: new Route({
        auth: false,
        perms: [],
        method: 'POST',
        path: '/',
        validation: [engspaceBodyValidator(User)],
        handler: (req: Request, res: Response): Promise<void> =>
            Pool.connect(async db => {
                const hasAdmin = await UserDao.adminRegistered(db);
                if (hasAdmin) {
                    res.status(HttpStatus.FORBIDDEN).end();
                    return;
                }
                const userReq: IUser = req.body;
                if (!userReq.roles.includes(Role.Admin)) {
                    userReq.roles.push(Role.Admin);
                }
                const user = await UserDao.create(db, req.body);
                res.json(user);
            }),
    }),
};
