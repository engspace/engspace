import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { sql } from 'slonik';
import HttpStatus from 'http-status-codes';

import { IProject, Project } from '@engspace/core';

import { Pool, SqlLiteral } from '../../db';
import { ProjectDao } from '../../db/dao';

import { Route } from './routegen';

export const projectRoutes = {
    getByCode: new Route({
        auth: 'USER',
        method: 'GET',
        path: '/by-code/:code',
        validation: [
            param('code').isString(),
        ],
        handler: async (req: Request, res: Response): Promise<void> => Pool.connect(async (db) => {
            try {
                const project = await ProjectDao.findByCode(db, req.params.code);
                res.json(project);
            } catch (err) {
                console.log(err);
                res.status(HttpStatus.NOT_FOUND);
                res.end();
            }
        }),
    }),

    search: new Route({
        auth: 'USER',
        method: 'GET',
        path: '/',
        validation: [
            query('search').optional().isString(),
            query('offset').optional().isInt(),
            query('limit').optional().isInt(),
        ],
        handler: async (req: Request, res: Response): Promise<void> => Pool.connect(async (db) => {
            const { search, limit, offset } = req.query;

            const buildWhereClause = (args: Array<string | number>): string => {
                if (search) {
                    args.push(`%${search.replace(/s/g, '%')}%`);
                    const num = args.length;
                    return `
                        WHERE name ILIKE $${num}
                            OR code ILIKE $${num}
                            OR description ILIKE $${num}
                    `;
                }
                return '';
            };
            const buildLimitClause = (args: Array<string | number>): string => {
                if (limit) {
                    args.push(Number(limit));
                    return `LIMIT $${args.length}`;
                }
                return '';
            };
            const buildOffsetClause = (args: Array<string | number>): string => {
                if (offset) {
                    args.push(Number(offset));
                    return `OFFSET $${args.length}`;
                }
                return '';
            };

            const buildQuery = (): SqlLiteral<IProject> => {
                const args: Array<string | number> = [];
                const wc = buildWhereClause(args);
                const lc = buildLimitClause(args);
                const oc = buildOffsetClause(args);
                const clauses = [wc, lc, oc].filter(c => c.length !== 0).join(' ');
                return sql`
                        SELECT id, name, code, description
                        FROM project
                        ${sql.raw(clauses, args)}
                    `;
            };

            const queryRes = await db.any(buildQuery());
            const projects = queryRes.map(async qr => new Project({
                ...qr,
                members: await ProjectDao.findMembersByProjectId(db, qr.id as number),
            }));

            if (limit && projects.length === Number(limit)) {
                const buildCountQuery = (): SqlLiteral<number> => {
                    const args: Array<string | number> = [];
                    const wc = buildWhereClause(args);
                    return sql`SELECT count(*) FROM project ${sql.raw(wc, args)}`;
                };
                const count = await db.oneFirst(buildCountQuery());
                res.set('Total-Count', String(count));
            } else {
                res.set('Total-Count', String(projects.length));
            }
            res.json(await Promise.all(projects));
        }),
    }),

    create: new Route({
        auth: 'MANAGER',
        method: 'POST',
        path: '/',

        validation: [
            body('name').isString(),
            body('code').isString(),
            body('description').optional(),
            body('members').isArray(),
            body('members.*.user.id').isInt(),
            body('members.*.leader').isBoolean(),
            body('members.*.designer').isBoolean(),
        ],

        handler: async (req: Request, res: Response): Promise<void> => Pool.connect(async (db) => {
            const proj = await ProjectDao.create(db, req.body);
            res.json(proj);
        }),
    }),
};
