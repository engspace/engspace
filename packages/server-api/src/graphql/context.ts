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
    return ({ ctx }): GqlContext => {
        const gqlCtx = {
            config,
            auth: getAuthToken(ctx),
            db: getDb(ctx),
            koaCtx: ctx,
            loaders: null,
        };
        gqlCtx.loaders = makeLoaders(gqlCtx);
        return gqlCtx;
    };
}
