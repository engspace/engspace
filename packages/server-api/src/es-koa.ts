import Application, { Middleware, ParameterizedContext } from 'koa';
import { AuthToken } from '@engspace/core';
import { Db } from '@engspace/server-db';

export interface EsKoaState {
    authToken: AuthToken;
    db: Db;
}

export type EsKoa = Application<EsKoaState>;
export type EsKoaContext = ParameterizedContext<EsKoaState>;
export type EsKoaMiddleware = Middleware<EsKoaState>;
