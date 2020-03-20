import { buildDefaultAppRolePolicies } from '@engspace/core';
import { EsServerApi, PartBaseRefNaming, PartRefNaming } from '@engspace/server-api';
import {
    connectionString,
    createDbPool,
    DbConnConfig,
    DbPool,
    DbPoolConfig,
    DbPreparationConfig,
    initSchema,
    prepareDb,
    ServerConnConfig,
} from '@engspace/server-db';
import events from 'events';
import Koa from 'koa';
import logger from 'koa-logger';
import { populateData } from './populate-data';

events.EventEmitter.defaultMaxListeners = 100;

const config = {
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT,
    dbUser: process.env.DB_USER,
    dbPass: process.env.DB_PASS,
    dbName: process.env.DB_NAME,
    serverPort: process.env.SERVER_PORT,
    storePath: process.env.STORE_PATH,
};

const serverConnConfig: ServerConnConfig = {
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    pass: config.dbPass,
};

const dbConnConfig: DbConnConfig = {
    ...serverConnConfig,
    name: config.dbName,
};

const dbPreparationConfig: DbPreparationConfig = {
    serverConnString: connectionString(serverConnConfig),
    name: dbConnConfig.name,
    formatDb: true,
};

const dbPoolConfig: DbPoolConfig = {
    dbConnString: connectionString(dbConnConfig),
    slonikOptions: {
        captureStackTrace: true,
    },
};

const pool: DbPool = createDbPool(dbPoolConfig);
prepareDb(dbPreparationConfig)
    .then(async () => {
        await pool.transaction(db => initSchema(db));
        await populateData(pool, config.storePath);
        const api = buildServerApi(pool);
        api.koa.listen(config.serverPort, () => {
            console.log(`Demo API listening to port ${config.serverPort}`);
        });
    })
    .catch(err => {
        console.error('error during the demo app');
        console.error(err);
    });

function buildServerApi(pool: DbPool): EsServerApi {
    const rolePolicies = buildDefaultAppRolePolicies();

    const api = new EsServerApi(new Koa(), {
        pool,
        rolePolicies,
        storePath: config.storePath,
        cors: true,
        refNaming: {
            partBase: new PartBaseRefNaming('${fam_code}${fam_count:4}'),
            part: new PartRefNaming('${part_base_ref}${part_version:AA}'),
        },
    });
    api.koa.use(logger());

    api.setupPlayground();
    api.setupAuthAndHttpRoutes('/api');
    api.setupGqlEndpoint('/api/graphql');

    return api;
}
