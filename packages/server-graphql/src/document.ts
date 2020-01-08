import Koa from 'koa';
import { DbPool } from '@engspace/server-db';
import Router from '@koa/router';

export function setupDocumentAPI(app: Koa, pool: DbPool): void {
    const router = new Router();

    app.use(async (ctx, next) => {
        if (ctx.path.startsWith('/document/upload')) {
            //
        } else {
            await next();
        }
    });
}
