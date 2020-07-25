import { EsServerConfig } from '..';
import { ApiContext } from '../control';
import { EsKoaContext } from '../es-koa';
import { GqlLoaders, makeLoaders } from './loaders';

export interface GqlContext extends ApiContext {
    loaders: GqlLoaders;
}

export interface HasEsKoaContext {
    ctx: EsKoaContext;
}

export interface GqlContextFactory {
    (obj: HasEsKoaContext): GqlContext;
}

export function gqlContextFactory(config: EsServerConfig): GqlContextFactory {
    return ({ ctx }): GqlContext => {
        const gqlCtx = {
            config,
            auth: ctx.state.authToken,
            db: ctx.state.db,
            loaders: null,
        };
        gqlCtx.loaders = makeLoaders(gqlCtx, config.control);
        return gqlCtx;
    };
}
