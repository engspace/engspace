import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import HttpStatus from 'http-status-codes';

import { Project } from '@engspace/core';
import { Pool, ProjectDao } from '@engspace/server-db';

import { Route } from './routegen';
import { engspaceBodyValidator } from '../validation';

export const projectRoutes = {
    getByCode: new Route({
        perms: ['project.get'],
        method: 'GET',
        path: '/by-code/:code',
        validation: [param('code').isString()],
        handler: async (req: Request, res: Response): Promise<void> =>
            Pool.connect(async db => {
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
        perms: ['project.get'],
        method: 'GET',
        path: '/',
        validation: [
            query('search')
                .optional()
                .isString(),
            query('member')
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
            const { count, projects } = await Pool.connect(async db =>
                ProjectDao.search(db, req.query)
            );
            res.set('Total-Count', String(count));
            res.json(projects);
        },
    }),

    create: new Route({
        perms: ['project.post'],
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

        handler: async (req: Request, res: Response): Promise<void> => {
            const proj = await Pool.transaction(async db => ProjectDao.create(db, req.body));
            res.json(proj);
        },
    }),

    update: new Route({
        perms: ['project.patch'],
        method: 'PUT',
        path: '/',

        validation: [engspaceBodyValidator(Project)],

        handler: async (req: Request, res: Response): Promise<void> => {
            const proj = await Pool.transaction(async db => ProjectDao.updateById(db, req.body));
            res.json(proj);
        },
    }),
};
