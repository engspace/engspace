import { AuthToken, EsRolePolicies } from '@engspace/core';
import { EsDaoSet } from '@engspace/server-db';
import { EsContext, EsControlSet } from '../control';
import { EsKoaContext } from '../es-koa';
import { GqlLoaders, makeLoaders } from './loaders';

export interface EsGqlContext<
    TokenT extends AuthToken = AuthToken,
    DaoT extends EsDaoSet = EsDaoSet,
    ControlT extends EsControlSet = EsControlSet,
    RolePoliciesT extends EsRolePolicies = EsRolePolicies,
    NamingCtxT = undefined
> extends EsContext<TokenT, DaoT, ControlT, RolePoliciesT, NamingCtxT> {
    loaders: GqlLoaders;
}

export interface HasEsKoaContext {
    ctx: EsKoaContext;
}

export interface GqlContextFactory {
    (obj: HasEsKoaContext): EsGqlContext;
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
