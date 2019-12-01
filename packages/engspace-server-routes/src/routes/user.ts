import { Request, Response } from 'express';
import HttpStatus from 'http-status-codes';
import { body, param, query } from 'express-validator';

import { IUser, Role } from '@engspace/core';
import { Pool, UserDao } from '@engspace/server-db';

import { Route } from './routegen';
import { UserReqSymbol } from './auth';

export const userRoutes = {
    create: new Route({
        auth: true,
        perms: ['user.post'],
        method: 'POST',
        path: '/',

        validation: [
            body('name').isString(),
            body('email')
                .isEmail()
                .normalizeEmail(),
            body('fullName')
                .optional()
                .isString(),
            body('password').isString(),
            body('roles').isArray(),
        ],

        handler: (req: Request, res: Response): Promise<void> =>
            Pool.connect(async db => {
                const user = await UserDao.create(db, req.body);
                res.json(user);
            }),
    }),

    partialUpdate: new Route({
        auth: true,
        perms: ['user.patch'],
        method: 'PATCH',
        path: '/:id',
        validation: [
            param('id').isInt(),
            body('name')
                .optional()
                .isString(),
            body('email')
                .optional()
                .isString(),
            body('fullName')
                .optional()
                .isString(),
            body('roles')
                .optional()
                .isArray(),
            body('password')
                .optional()
                .custom(value => value === null || typeof value === 'string'),
        ],
        handler: async (req: Request, res: Response): Promise<void> => {
            const id = Number(req.params.id);
            // checking authorizations and request validity
            // TODO check for permission instead of role
            const user: IUser = req[UserReqSymbol];
            const isAdmin = user.roles.includes(Role.Admin);
            if (user.id !== id && !isAdmin) {
                return res.status(HttpStatus.FORBIDDEN).end();
            }
            if ('name' in req.body || 'admin' in req.body || 'manager' in req.body) {
                if (!isAdmin) {
                    return res.status(HttpStatus.FORBIDDEN).end();
                }
            }
            let password;
            if ('password' in req.body) {
                ({ password } = req.body);
                if (password !== null && !password) {
                    // must be set or null
                    return res.status(HttpStatus.BAD_REQUEST).end();
                }
                if (!password && !isAdmin) {
                    return res.status(HttpStatus.FORBIDDEN).end();
                }
                if (password && user.id !== id) {
                    return res.status(HttpStatus.FORBIDDEN).end();
                }
            }
            const result = await Pool.transaction(async db => {
                return UserDao.patch(db, id, req.body);
            });
            res.json(result);
        },
    }),

    search: new Route({
        auth: true,
        perms: ['user.get'],
        method: 'GET',
        path: '/',

        validation: [
            query('phrase')
                .optional()
                .isString(),
            query('role')
                .optional()
                .isString(),
            query('offset')
                .optional()
                .isInt(),
            query('limit')
                .optional()
                .isInt(),
        ],

        handler: async (req: Request, res: Response): Promise<void> => {
            return Pool.connect(async db => {
                const result = await UserDao.search(db, req.query);

                res.set('Total-Count', String(result.count));
                res.json(result.users);
            });
        },
    }),
};
