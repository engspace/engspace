import { AppRolePolicies, AuthToken, buildDefaultAppRolePolicies } from '@engspace/core';
import { createDbPool, Db, DbPool, DbPoolConfig, initSchema, prepareDb } from '@engspace/server-db';
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

events.EventEmitter.defaultMaxListeners = 100;

chai.use(chaiAsPromised);
chai.use(chaiHttp);
chai.use(chaiUuid);

const dbConfig: DbPoolConfig = {
    user: process.env.DB_USER || 'postgres',
    pass: process.env.DB_PASS || 'postgres',
    port: process.env.DB_PORT || 5432,
    netloc: process.env.DB_NETLOC || 'localhost',
    name: process.env.DB_NAME || 'engspace_server_db_test',
    slonikOptions: {
        idleTimeout: 1000,
    },
};

export const pool: DbPool = createDbPool(dbConfig);

export const serverPort = process.env.SERVER_PORT || '3000';

export let api: EsServerApi;
export let rolePolicies: AppRolePolicies;

export const storePath = path.normalize(path.join(__dirname, '../file_store'));

export function buildGqlServer(db: Db, auth: AuthToken): ApolloServerTestClient {
    return createTestClient(api.buildTestGqlServer(db, auth));
}

before('Start-up DB and Server', async function() {
    await prepareDb({
        ...dbConfig,
        formatDb: true,
    });
    const schemaPromise = pool.transaction(db => initSchema(db));
    rolePolicies = buildDefaultAppRolePolicies();

    api = new EsServerApi(new Koa(), {
        pool,
        rolePolicies,
        storePath,
        cors: true,
    });

    api.setupAuthAndHttpRoutes('/api');
    api.setupGqlEndpoint('/api/graphql', false);

    await schemaPromise;
});

before('Create test store', async function() {
    await fs.promises.mkdir(storePath, {
        recursive: true,
    });
});

after('Delete test store', async function() {
    await fs.promises.rmdir(storePath, {
        recursive: true,
    });
});
