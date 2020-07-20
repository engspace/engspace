import events from 'events';
import logger from 'koa-logger';
import { buildDefaultAppRolePolicies, PartRefNaming, ChangeRequestNaming } from '@engspace/core';
import {
    buildControllerSet,
    buildSimpleEsApp,
    buildEsSchema,
    StaticEsNaming,
} from '@engspace/server-api';
import {
    buildDaoSet,
    connectionString,
    createDbPool,
    DbConnConfig,
    DbPool,
    DbPoolConfig,
    DbPreparationConfig,
    syncSchema,
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
const rolePolicies = buildDefaultAppRolePolicies();
const control = buildControllerSet(dao);
const schema = buildEsSchema(control);
const app = buildSimpleEsApp({
    prefix: '/api',
    cors: true,
    gql: {
        path: '/api/graphql',
        schema,
        logging: true,
    },
    config: {
        pool,
        rolePolicies,
        storePath: config.storePath,
        control,
        dao,
        naming: new StaticEsNaming({
            partRef: new PartRefNaming('${fam_code}${fam_count:4}${part_version:AA}'),
            changeRequest: new ChangeRequestNaming('$CR-${counter:4}'),
        }),
    },
});
app.use(logger());

prepareDb(dbPreparationConfig)
    .then(async () => {
        await pool.transaction(async (db) => {
            await syncSchema(db);
            await passwordLogin.buildSchema(db);
        });
        await populateData(pool, config.storePath);
        app.listen(config.serverPort, () => {
            console.log(`Demo API listening to port ${config.serverPort}`);
        });
    })
    .catch((err) => {
        console.error('error during the demo app');
        console.error(err);
    });
