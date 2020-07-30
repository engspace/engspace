import { AuthToken, EsRolePolicies } from '@engspace/core';
import { DaoSet } from '@engspace/server-db';
import { EsServerConfig } from '..';
import { ApiContext, ControllerSet } from '../control';
import { EsKoaContext } from '../es-koa';
import { GqlLoaders, makeLoaders } from './loaders';

export interface GqlContext<
    TokenT extends AuthToken = AuthToken,
    DaoT extends DaoSet = DaoSet,
    ControlT extends ControllerSet = ControllerSet,
    RolePoliciesT extends EsRolePolicies = EsRolePolicies,
    NamingCtxT = undefined
> extends ApiContext<TokenT, DaoT, ControlT, RolePoliciesT, NamingCtxT> {
    loaders: GqlLoaders;
}

export interface HasEsKoaContext {
    ctx: EsKoaContext;
}

export interface GqlContextFactory {
    (obj: HasEsKoaContext): GqlContext;
}

export const gqlContextFactory: GqlContextFactory = ({ ctx }) => {
    const { runtime, config } = ctx;
    const { db, authToken: auth } = ctx.state;
    const gqlCtx = {
        config,
        runtime,
        auth,
        db,
        loaders: null,
    };
    gqlCtx.loaders = makeLoaders(gqlCtx);
    return gqlCtx;
};
