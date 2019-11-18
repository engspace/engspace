import { Request, Response } from 'express';
import HttpStatus from 'http-status-codes';
import { body } from 'express-validator';
import { sql } from 'slonik';

import { Pool } from '@engspace/server-db';

import { signToken } from './auth';
import { Route } from './routegen';

export const rootRoutes = {
    login: new Route({
        auth: 'NONE',
        method: 'POST',
        path: '/login',
        validation: [
            body('nameOrEmail').isString(),
            body('password').isString(),
        ],
        handler: (req: Request, res: Response): Promise<void> =>
            Pool.connect(async db => {
                const { nameOrEmail, password } = req.body;
                const answ = await db.maybeOne(sql`
                SELECT
                    (password = crypt(${password}, password)) as ok,
                    id, full_name, admin, manager
                FROM "user"
                WHERE
                    name = ${nameOrEmail} OR
                    email = ${nameOrEmail}
            `);
                if (!answ || !answ.ok) {
                    res.status(HttpStatus.FORBIDDEN).end();
                } else {
                    res.json({
                        token: await signToken(
                            (answ as any) as {
                                id: number;
                                fullName: string;
                                admin: boolean;
                                manager: boolean;
                            }
                        ),
                    });
                }
            }),
    }),

    checkToken: new Route({
        auth: 'USER',
        method: 'GET',
        path: '/check_token',
        handler: async (req: Request, res: Response): Promise<void> =>
            res.status(HttpStatus.OK).end(),
    }),
};
