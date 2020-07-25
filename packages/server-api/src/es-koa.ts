import Application, { Middleware, ParameterizedContext } from 'koa';
import { AuthToken } from '@engspace/core';

export interface EsKoaState {
    authToken: AuthToken;
}

export type EsKoa = Application<EsKoaState>;
export type EsKoaContext = ParameterizedContext<EsKoaState>;
export type EsKoaMiddleware = Middleware<EsKoaState>;
