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
    EsRolePolicies,
    AuthToken,
    buildDefaultAppRolePolicies,
    PartRefNaming,
    ChangeRequestNaming,
} from '@engspace/core';
import {
    buildEsDaoSet,
    connectionString,
    createDbPool,
    Db,
    DbConnConfig,
    DbPool,
    DbPoolConfig,
    DbPreparationConfig,
    syncSchema,
    prepareDb,
    ServerConnConfig,
    TestHelpers,
    passwordLogin,
} from '@engspace/server-db';
import {
    buildSimpleEsApp,
    buildTestGqlServer,
    buildEsControlSet,
    buildEsSchema,
    StaticEsNaming,
} from '../src';

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
export const rolePolicies: EsRolePolicies = buildDefaultAppRolePolicies();
export const dao = buildEsDaoSet();
export const jwtSecret = 'test-secret-key';
const control = buildEsControlSet();
const schema = buildEsSchema();
const storePath = path.normalize(path.join(__dirname, '../file_store'));
export const runtime = {
    pool,
    dao,
    control,
};
export const config = {
    rolePolicies,
    storePath,
    naming: new StaticEsNaming({
        partRef: new PartRefNaming('${fam_code}${fam_count:3}.${part_version:A}'),
        changeRequest: new ChangeRequestNaming('CR-${counter:3}'),
    }),
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
    runtime,
    config,
    jwtSecret,
});

export const th = new TestHelpers(pool, dao);

export function buildGqlServer(db: Db, auth: AuthToken): ApolloServerTestClient {
    return createTestClient(buildTestGqlServer({ db, auth, schema, runtime, config }));
}

before('Start-up DB and Server', async function () {
    this.timeout(5000);
    console.log('preparing db with config:');
    console.log(dbPreparationConfig);
    await prepareDb(dbPreparationConfig);
    await pool.transaction(async (db) => {
        await syncSchema(db);
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
