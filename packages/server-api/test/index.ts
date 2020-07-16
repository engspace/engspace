import events from 'events';
import fs from 'fs';
import path from 'path';
import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiHttp from 'chai-http';
import chaiSubset from 'chai-subset';
import chaiUuid from 'chai-uuid';
import 'mocha';
import {
    AppRolePolicies,
    AuthToken,
    buildDefaultAppRolePolicies,
    PartRefNaming,
    ChangeRequestNaming,
} from '@engspace/core';
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
    TestHelpers,
    passwordLogin,
} from '@engspace/server-db';
import { buildSimpleEsApp, buildTestGqlServer, buildControllerSet, buildEsSchema } from '../src';

events.EventEmitter.defaultMaxListeners = 100;

chai.use(chaiAsPromised);
chai.use(chaiHttp);
chai.use(chaiUuid);
chai.use(chaiSubset);

const serverConnConfig: ServerConnConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT,
    user: process.env.DB_USER || 'postgres',
    pass: process.env.DB_PASS || 'postgres',
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
const schema = buildEsSchema(control);
const storePath = path.normalize(path.join(__dirname, '../file_store'));
export const config = {
    pool,
    rolePolicies,
    storePath,
    control,
    dao,
    naming: {
        partRef: new PartRefNaming('${fam_code}${fam_count:3}.${part_version:A}'),
        changeRequest: new ChangeRequestNaming('CR-${counter:3}'),
    },
    serverPort: 3000, // needed in other test modules
};

export const app = buildSimpleEsApp({
    prefix: '/api',
    cors: true,
    gql: {
        path: '/api/graphql',
        schema,
        logging: false,
    },
    config,
});

export const th = new TestHelpers(pool, dao);

export function buildGqlServer(db: Db, auth: AuthToken): ApolloServerTestClient {
    return createTestClient(buildTestGqlServer({ db, auth, schema, config }));
}

before('Start-up DB and Server', async function () {
    this.timeout(5000);
    console.log('preparing db with config:');
    console.log(dbPreparationConfig);
    await prepareDb(dbPreparationConfig);
    await pool.transaction(async (db) => {
        await initSchema(db, dao);
        await passwordLogin.buildSchema(db);
    });
});

before('Create test store', async function () {
    await fs.promises.mkdir(storePath, {
        recursive: true,
    });
});

after('Delete test store', async function () {
    await fs.promises.rmdir(storePath, {
        recursive: true,
    });
});
