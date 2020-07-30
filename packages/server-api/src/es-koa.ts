import Application, { Middleware, ParameterizedContext } from 'koa';
import { AuthToken, EsRolePolicies } from '@engspace/core';
import { Db, DaoSet } from '@engspace/server-db';
import { EsServerRuntime, EsServerConfig } from '.';
import { ControllerSet } from './control';

/**
 * State attached by middleware depending on middleware path
 */
export interface EsKoaState<TokenT extends AuthToken = AuthToken> {
    authToken: TokenT;
    db: Db;
}

/**
 * State statically attached at startup
 */
export interface EsKoaCustom<
    DaoT extends DaoSet = DaoSet,
    ControlT extends ControllerSet = ControllerSet,
    RolePoliciesT extends EsRolePolicies = EsRolePolicies,
    NamingCtxT = undefined
> {
    runtime: EsServerRuntime<DaoT, ControlT>;
    config: EsServerConfig<RolePoliciesT, NamingCtxT>;
}

export type EsKoa = Application<EsKoaState, EsKoaCustom>;
export type EsKoaContext = ParameterizedContext<EsKoaState, EsKoaCustom>;
export type EsKoaMiddleware = Middleware<EsKoaState, EsKoaCustom>;
