import Router from '@koa/router';
import HttpStatus from 'http-status-codes';
import validator from 'validator';
import { EsServerConfig } from '..';

export function setupFirstAdminRoutes(router: Router, config: EsServerConfig): void {
    const { pool, dao } = config;

    router.get('/first_admin', async (ctx) => {
        const result = await pool.connect((db) =>
            dao.user.search(db, {
                role: 'admin',
            })
        );
        ctx.response.body = {
            hasAdmin: result.count >= 1,
        };
    });

    router.post('/first_admin', async (ctx) => {
        await pool.transaction(async (db) => {
            const adminSearch = await dao.user.search(db, {
                role: 'admin',
            });
            ctx.assert(adminSearch.count === 0, HttpStatus.FORBIDDEN);
            const { name, email, fullName, password } = ctx.request.body;
            ctx.assert(
                typeof name === 'string' && name.length > 0,
                HttpStatus.BAD_REQUEST,
                'empty name'
            );
            ctx.assert(validator.isEmail(email), HttpStatus.BAD_REQUEST, 'wrong email format');

            ctx.assert(
                typeof password === 'string' && password.length > 0,
                HttpStatus.BAD_REQUEST,
                'missing password'
            );

            ctx.response.body = await dao.user.create(
                db,
                { name, email, fullName, roles: ['admin'] },
                { withRoles: true }
            );
        });
    });
}
