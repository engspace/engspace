import { AppRolePolicies, AuthToken, buildDefaultAppRolePolicies } from '@engspace/core';
import { createDbPool, Db, DbPool, initSchema } from '@engspace/server-db';
import { ApolloServerTestClient, createTestClient } from 'apollo-server-testing';
import chai from 'chai';
import chaiHttp from 'chai-http';
import chaiUuid from 'chai-uuid';
import config from 'config';
import events from 'events';
import fs from 'fs';
import Koa from 'koa';
import path from 'path';
import { EsServerApi } from '../src';

events.EventEmitter.defaultMaxListeners = 100;

chai.use(chaiHttp);
chai.use(chaiUuid);

export let pool: DbPool;
export let api: EsServerApi;
export let rolePolicies: AppRolePolicies;

export const storePath = path.normalize(path.join(__dirname, '../file_store'));

export function buildGqlServer(db: Db, auth: AuthToken): ApolloServerTestClient {
    return createTestClient(api.buildTestGqlServer(db, auth));
}

before('Start-up DB and Server', async function() {
    pool = await createDbPool(config.get('db'));
    const schemaPromise = pool.transaction(db => initSchema(db));

    await fs.promises.rmdir(storePath, {
        recursive: true,
    });
    await fs.promises.mkdir(storePath, {
        recursive: true,
    });

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
