import { Request, Response } from 'express';
import HttpStatus from 'http-status-codes';
import { sql, ValueExpressionType } from 'slonik';
import { body, param, query } from 'express-validator';

import { Pool, SqlLiteral, UserDao } from '@engspace/server-db';

import { Route } from './routegen';
import { IUser } from '@engspace/core';
import { raw } from 'slonik-sql-tag-raw';

export const userRoutes = {
    create: new Route({
        auth: 'ADMIN',
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
            body('admin')
                .optional()
                .isBoolean(),
            body('manager')
                .optional()
                .isBoolean(),
            body('password').isString(),
        ],

        handler: (req: Request, res: Response): Promise<void> =>
            Pool.connect(async db => {
                const user = await UserDao.create(db, req.body);
                res.json(user);
            }),
    }),

    partialUpdate: new Route({
        auth: 'USER',
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
            body('admin')
                .optional()
                .isBoolean(),
            body('manager')
                .optional()
                .isBoolean(),
            body('password')
                .optional()
                .custom(value => value === null || typeof value === 'string'),
        ],
        handler: async (req: Request, res: Response): Promise<void> => {
            const id = Number(req.params.id);
            // checking authorizations and request validity
            const user = (req as any).user as IUser;
            if (user.id !== id && !user.admin) {
                return res.status(HttpStatus.FORBIDDEN).end();
            }
            if (
                'name' in req.body ||
                'admin' in req.body ||
                'manager' in req.body
            ) {
                if (!user.admin) {
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
                if (!password && !user.admin) {
                    return res.status(HttpStatus.FORBIDDEN).end();
                }
                if (password && user.id !== id) {
                    return res.status(HttpStatus.FORBIDDEN).end();
                }
            }
            // fetch assignments
            const assignments = {
                ...req.body,
            };
            if ('password' in req.body) {
                if (password) {
                    assignments.password = raw("crypt($1, gen_salt('bf'))", [
                        req.body.password,
                    ]);
                } else {
                    assignments.password = null;
                }
            }

            const list: Array<ValueExpressionType> = [];
            for (const name in assignments) {
                list.push(
                    sql`${sql.identifier([name])} = ${assignments[name]}`
                );
            }

            return Pool.connect(async db => {
                const user = await db.one(sql`
                    UPDATE "user" SET
                        ${sql.join(list, sql`, `)}
                    WHERE id = ${id}
                    RETURNING
                        id, name, email, full_name, admin, manager
                `);
                res.json(user);
            });
        },
    }),

    search: new Route({
        auth: 'USER',
        method: 'GET',
        path: '/',

        validation: [
            query('search')
                .optional()
                .isString(),
            query('admin')
                .optional()
                .isBoolean(),
            query('manager')
                .optional()
                .isBoolean(),
            query('offset')
                .optional()
                .isInt(),
            query('limit')
                .optional()
                .isInt(),
        ],

        handler: async (req: Request, res: Response): Promise<void> => {
            return Pool.connect(async db => {
                const { offset, limit, search, admin, manager } = req.query;

                const buildWhereClause = (
                    args: (string | number)[]
                ): string => {
                    const comps = [];
                    if (search) {
                        args.push(`%${search.replace(/s/g, '%')}%`);
                        const num = args.length;
                        comps.push(`
                            (name ILIKE $${num}
                                OR email ILIKE $${num}
                                OR full_name ILIKE $${num})
                        `);
                    }
                    if (admin) {
                        args.push(admin);
                        comps.push(`admin = $${args.length}`);
                    }
                    if (manager) {
                        args.push(manager);
                        comps.push(`manager = $${args.length}`);
                    }
                    return comps.length === 0
                        ? ''
                        : `WHERE ${comps.join(' AND ')}`;
                };
                const buildLimitClause = (
                    args: (string | number)[]
                ): string => {
                    if (limit) {
                        args.push(Number(limit));
                        return `LIMIT $${args.length}`;
                    }
                    return '';
                };
                const buildOffsetClause = (
                    args: (string | number)[]
                ): string => {
                    if (offset) {
                        args.push(Number(offset));
                        return `OFFSET $${args.length}`;
                    }
                    return '';
                };

                const buildQuery = (): SqlLiteral => {
                    const args: (string | number)[] = [];
                    const wc = buildWhereClause(args);
                    const lc = buildLimitClause(args);
                    const oc = buildOffsetClause(args);
                    const clauses = [wc, lc, oc]
                        .filter(c => c.length !== 0)
                        .join(' ');
                    return sql`
                        SELECT id, name, email, full_name, admin, manager
                        FROM "user"
                        ${raw(clauses, args)}
                    `;
                };

                const users: IUser[] = await db.any(buildQuery());

                if (limit && users.length === Number(limit)) {
                    const buildCountQuery = (): SqlLiteral => {
                        const args: (string | number)[] = [];
                        const wc = buildWhereClause(args);
                        return sql`SELECT count(*) FROM "user" ${raw(
                            wc,
                            args
                        )}`;
                    };
                    const count: number = await db.oneFirst(buildCountQuery());
                    res.set('Total-Count', String(count));
                } else {
                    res.set('Total-Count', String(users.length));
                }
                res.json(users);
            });
        },
    }),
};
