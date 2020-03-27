import Koa from 'koa';
import { EsServerConfig } from '..';
import { ApiContext } from '../control';
import { getAuthToken, getDb } from '../internal';
import { GqlLoaders, makeLoaders } from './loaders';

export interface GqlContext extends ApiContext {
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
            loaders: null,
        };
        gqlCtx.loaders = makeLoaders(gqlCtx, config.control);
        return gqlCtx;
    };
}
