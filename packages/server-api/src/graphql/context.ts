import Koa from 'koa';
import { EsServerConfig } from '..';
import { ApiContext } from '../controllers';
import { getAuthToken, getDb } from '../internal';
import { GqlLoaders, makeLoaders } from './loaders';

export interface GqlContext extends ApiContext {
    koaCtx: Koa.Context;
    loaders: GqlLoaders;
}

export interface HasKoaContext {
    ctx: Koa.Context;
}

export interface GqlContextFactory {
    (obj: HasKoaContext): GqlContext;
}

export function gqlContextFactory(config: EsServerConfig): GqlContextFactory {
    const { rolePolicies, storePath } = config;
    return ({ ctx }): GqlContext => {
        const gqlCtx = {
            koaCtx: ctx,
            auth: getAuthToken(ctx),
            rolePolicies,
            db: getDb(ctx),
            loaders: null,
            storePath,
        };
        gqlCtx.loaders = makeLoaders(gqlCtx);
        return gqlCtx;
    };
}
