import { buildDefaultAppRolePolicies } from '@engspace/core';
import { populateDemo } from '@engspace/demo-data';
import { createDbPool, DbPool, initSchema } from '@engspace/server-db';
import {
    initGqlApp,
    setupPlaygroundLogin,
    setupAuth,
    setupPlaygroundEndpoint,
    setupGqlEndpoint,
} from '@engspace/server-graphql';
import cors from '@koa/cors';
import Koa from 'koa';
import logger from 'koa-logger';
import config from 'config';
import events from 'events';

events.EventEmitter.defaultMaxListeners = 100;

function buildGqlApp(pool: DbPool): Koa {
    const policies = buildDefaultAppRolePolicies();

    const app = initGqlApp();
    app.use(logger());
    app.use(
        cors({
            keepHeadersOnError: true,
        })
    );

    setupPlaygroundLogin('/gql-playground', app, pool, policies);
    setupPlaygroundEndpoint('/gql-playground', app, pool, policies);

    setupAuth('/api/auth', app, pool, policies);

    setupGqlEndpoint('/api/graphql', app, pool, policies);

    return app;
}

createDbPool(config.get('db'))
    .then(async pool => {
        await pool.transaction(db => initSchema(db));
        await populateDemo(pool);
        return pool;
    })
    .then(async pool => {
        const { port } = config.get('server');
        const app = buildGqlApp(pool);
        app.listen(port, () => {
            console.log(`Demo API listening to port ${port}`);
        });
    })
    .catch(err => {
        console.error('error during the demo app');
        console.error(err);
    });
