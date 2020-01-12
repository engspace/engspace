import { buildDefaultAppRolePolicies } from '@engspace/core';
import { populateDemo } from '@engspace/demo-data';
import { EsServerApi } from '@engspace/server-api';
import { createDbPool, DbPool, initSchema } from '@engspace/server-db';
import config from 'config';
import events from 'events';
import Koa from 'koa';
import logger from 'koa-logger';
import path from 'path';

events.EventEmitter.defaultMaxListeners = 100;

const storePath = path.normalize(path.join(__dirname, '../file_store'));

function buildServerApi(pool: DbPool): EsServerApi {
    const rolePolicies = buildDefaultAppRolePolicies();

    const api = new EsServerApi(new Koa(), {
        pool,
        rolePolicies,
        storePath,
        cors: true,
    });
    api.koa.use(logger());

    api.setupPlayground('/graphql-playground');
    api.setupAuthAndHttpRoutes('/api');
    api.setupGqlEndpoint('/api/graphql');

    return api;
}

createDbPool(config.get('db'))
    .then(async pool => {
        await pool.transaction(db => initSchema(db));
        await populateDemo(pool, storePath);
        return pool;
    })
    .then(async pool => {
        const api = buildServerApi(pool);
        const { port } = config.get('server');
        api.koa.listen(port, () => {
            console.log(`Demo API listening to port ${port}`);
        });
    })
    .catch(err => {
        console.error('error during the demo app');
        console.error(err);
    });
