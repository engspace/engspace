import Application, { Middleware, ParameterizedContext } from 'koa';
import { AuthToken, EsRolePolicies, RolePolicy } from '@engspace/core';
import { Db, EsDaoSet } from '@engspace/server-db';
import { EsControlSet } from './control';
import { EsServerRuntime, EsServerConfig } from '.';

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
    DaoT extends EsDaoSet = EsDaoSet,
    ControlT extends EsControlSet = EsControlSet,
    RolePoliciesT extends EsRolePolicies = EsRolePolicies,
    NamingCtxT = undefined
> {
    runtime: EsServerRuntime<DaoT, ControlT>;
    config: EsServerConfig<RolePoliciesT, NamingCtxT>;
}

export type EsKoa<
    TokenT extends AuthToken = AuthToken,
    DaoT extends EsDaoSet = EsDaoSet,
    ControlT extends EsControlSet = EsControlSet,
    RolePoliciesT extends EsRolePolicies = EsRolePolicies,
    NamingCtxT = undefined
> = Application<EsKoaState<TokenT>, EsKoaCustom<DaoT, ControlT, RolePoliciesT, NamingCtxT>>;

export type EsKoaContext<
    TokenT extends AuthToken = AuthToken,
    DaoT extends EsDaoSet = EsDaoSet,
    ControlT extends EsControlSet = EsControlSet,
    RolePoliciesT extends EsRolePolicies = EsRolePolicies,
    NamingCtxT = undefined
> = ParameterizedContext<
    EsKoaState<TokenT>,
    EsKoaCustom<DaoT, ControlT, RolePoliciesT, NamingCtxT>
>;

export type EsKoaMiddleware<
    TokenT extends AuthToken = AuthToken,
    DaoT extends EsDaoSet = EsDaoSet,
    ControlT extends EsControlSet = EsControlSet,
    RolePoliciesT extends EsRolePolicies = EsRolePolicies,
    NamingCtxT = undefined
> = Middleware<EsKoaState<TokenT>, EsKoaCustom<DaoT, ControlT, RolePoliciesT, NamingCtxT>>;
