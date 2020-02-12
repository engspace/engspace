import { AppRolePolicies, AuthToken, buildDefaultAppRolePolicies } from '@engspace/core';
import { EsServerApi } from '@engspace/server-api';
import { createDbPool, Db, DbPool, initSchema } from '@engspace/server-db';
import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import chai from 'chai';
import chaiHttp from 'chai-http';
import config from 'config';
import events from 'events';
import Koa from 'koa';
import path from 'path';

events.EventEmitter.defaultMaxListeners = 100;

chai.use(chaiHttp);

export let pool: DbPool;
export let api: EsServerApi;
export let rolePolicies: AppRolePolicies;

const storePath = path.normalize(path.join(__dirname, '../file_store'));

export function buildGqlServer(db: Db, auth: AuthToken): ApolloServerTestClient {
    return createTestClient(api.buildTestGqlServer(db, auth));
}

before('Start-up DB and Server', async () => {
    pool = await createDbPool(config.get('db'));
    const schemaPromise = pool.transaction(db => initSchema(db));

    rolePolicies = buildDefaultAppRolePolicies();

    api = new EsServerApi(new Koa(), {
        pool,
        rolePolicies,
        storePath,
        cors: true,
    });

    api.setupAuthAndHttpRoutes('/api');
    api.setupGqlEndpoint('/api/graphql');

    await schemaPromise;
});
