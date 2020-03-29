import { AppRolePolicies, AuthToken, buildDefaultAppRolePolicies } from '@engspace/core';
import {
    buildDaoSet,
    connectionString,
    createDbPool,
    Db,
    DbConnConfig,
    DbPool,
    DbPoolConfig,
    DbPreparationConfig,
    initSchema,
    prepareDb,
    ServerConnConfig,
} from '@engspace/server-db';
import { TestHelpers } from '@engspace/server-db/dist/test-helpers';
import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiHttp from 'chai-http';
import chaiUuid from 'chai-uuid';
import events from 'events';
import fs from 'fs';
import Koa from 'koa';
import path from 'path';
import { EsServerApi } from '../src';
import { buildControllerSet } from '../src/control';
import { PartBaseRefNaming, PartRefNaming } from '../src/ref-naming';

events.EventEmitter.defaultMaxListeners = 100;

chai.use(chaiAsPromised);
chai.use(chaiHttp);
chai.use(chaiUuid);

export const config = {
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: process.env.DB_PORT,
    dbUser: process.env.DB_USER || 'postgres',
    dbPass: process.env.DB_PASS || 'postgres',
    storePath: path.normalize(path.join(__dirname, '../file_store')),
    serverPort: 3000,
};

const serverConnConfig: ServerConnConfig = {
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    pass: config.dbPass,
};

const dbConnConfig: DbConnConfig = {
    ...serverConnConfig,
    name: 'engspace_api_test',
};

const dbPreparationConfig: DbPreparationConfig = {
    serverConnString: connectionString(serverConnConfig),
    name: dbConnConfig.name,
    formatDb: true,
};

const dbPoolConfig: DbPoolConfig = {
    dbConnString: connectionString(dbConnConfig),
    slonikOptions: {
        idleTimeout: 1000,
        captureStackTrace: true,
    },
};

export const pool: DbPool = createDbPool(dbPoolConfig);
export const rolePolicies: AppRolePolicies = buildDefaultAppRolePolicies();
export const dao = buildDaoSet();
const control = buildControllerSet(dao);

export const th = new TestHelpers(pool, dao);

export const api = new EsServerApi(new Koa(), {
    pool,
    rolePolicies,
    storePath: config.storePath,
    control,
    dao,
    cors: true,
    refNaming: {
        partBase: new PartBaseRefNaming('${fam_code}${fam_count:3}'),
        part: new PartRefNaming('${part_base_ref}.${part_version:01}'),
    },
});

api.setupAuthAndHttpRoutes('/api');
api.setupGqlEndpoint('/api/graphql', false);

export function buildGqlServer(db: Db, auth: AuthToken): ApolloServerTestClient {
    return createTestClient(api.buildTestGqlServer(db, auth));
}

before('Start-up DB and Server', async function() {
    console.log('preparing db with config:');
    console.log(dbPreparationConfig);
    await prepareDb(dbPreparationConfig);
    await pool.transaction(db => initSchema(db));
});

before('Create test store', async function() {
    await fs.promises.mkdir(config.storePath, {
        recursive: true,
    });
});

after('Delete test store', async function() {
    await fs.promises.rmdir(config.storePath, {
        recursive: true,
    });
});
