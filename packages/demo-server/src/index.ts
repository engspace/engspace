import { buildDefaultAppRolePolicies } from '@engspace/core';
import { populateData } from './populate-data';
import { EsServerApi } from '@engspace/server-api';
import { createDbPool, DbPool, initSchema, DbPoolConfig, prepareDb } from '@engspace/server-db';
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

    api.setupPlayground();
    api.setupAuthAndHttpRoutes('/api');
    api.setupGqlEndpoint('/api/graphql');

    return api;
}

const dbConfig: DbPoolConfig = {
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    port: process.env.DB_PORT,
    netloc: process.env.DB_NETLOC,
    name: process.env.DB_NAME,
    slonikOptions: {
        captureStackTrace: true,
    },
};

const serverPort = process.env.SERVER_PORT;

const pool: DbPool = createDbPool(dbConfig);

prepareDb({ ...dbConfig, formatDb: true })
    .then(async () => {
        await pool.transaction(db => initSchema(db));
        await populateData(pool, storePath);
        return pool;
    })
    .then(async pool => {
        const api = buildServerApi(pool);
        api.koa.listen(serverPort, () => {
            console.log(`Demo API listening to port ${serverPort}`);
        });
    })
    .catch(err => {
        console.error('error during the demo app');
        console.error(err);
    });
