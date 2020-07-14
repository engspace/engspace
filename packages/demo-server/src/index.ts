import events from 'events';
import Koa from 'koa';
import logger from 'koa-logger';
import { buildDefaultAppRolePolicies, PartRefNaming, ChangeRequestNaming } from '@engspace/core';
import { buildControllerSet, EsServerApi } from '@engspace/server-api';
import {
    buildDaoSet,
    connectionString,
    createDbPool,
    DbConnConfig,
    DbPool,
    DbPoolConfig,
    DbPreparationConfig,
    initSchema,
    prepareDb,
    ServerConnConfig,
    passwordLogin,
} from '@engspace/server-db';
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
export const dao = buildDaoSet();

prepareDb(dbPreparationConfig)
    .then(async () => {
        await pool.transaction(async (db) => {
            await initSchema(db);
            await passwordLogin.buildSchema(db);
        });
        await populateData(pool, config.storePath);
        const api = buildServerApi(pool);
        api.koa.listen(config.serverPort, () => {
            console.log(`Demo API listening to port ${config.serverPort}`);
        });
    })
    .catch((err) => {
        console.error('error during the demo app');
        console.error(err);
    });

function buildServerApi(pool: DbPool): EsServerApi {
    const rolePolicies = buildDefaultAppRolePolicies();
    const control = buildControllerSet(dao);

    const api = new EsServerApi(new Koa(), {
        pool,
        rolePolicies,
        storePath: config.storePath,
        control,
        dao,
        cors: true,
        naming: {
            partRef: new PartRefNaming('${fam_code}${fam_count:4}${part_version:AA}'),
            changeRequest: new ChangeRequestNaming('$CR-${counter:4}'),
        },
    });
    api.koa.use(logger());

    api.setupPlayground();
    api.setupAuthAndHttpRoutes('/api');
    api.setupGqlEndpoint('/api/graphql');

    return api;
}
