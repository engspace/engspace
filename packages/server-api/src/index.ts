import Router from '@koa/router';
import Koa from 'koa';
import { AppRolePolicies, PartRefNaming, ChangeRequestNaming } from '@engspace/core';
import { DaoSet, DbPool } from '@engspace/server-db';
import { buildControllerSet, ControllerSet } from './control';
import {
    requireAuthMiddleware,
    documentMiddlewares,
    firstAdminMiddleware,
    graphQLMiddleware,
    passwordLoginMiddleware,
    bodyParserMiddleware,
    corsMiddleware,
    checkTokenMiddleware,
    EsGraphQLConfig,
} from './middlewares';

export { ControllerSet, buildControllerSet };
export {
    checkAuthMiddleware,
    checkAuthOrDefaultMiddleware,
    checkTokenEndpoint,
    requireAuthMiddleware,
    documentMiddlewares,
    firstAdminMiddleware,
    EsGraphQLConfig,
    graphQLMiddleware,
    buildTestGqlServer,
    setupPlaygroundLogin,
    passwordLoginMiddleware,
    bodyParserMiddleware,
    corsMiddleware,
} from './middlewares';
export { GqlContext } from './graphql/context';
export {
    buildEsSchema,
    defaultGqlModules,
    baseGqlModule,
    userGqlModule,
    projectGqlModule,
    changeGqlModule,
    partGqlModule,
    GqlEsModule,
    resolveTracked,
} from './graphql/schema';

export interface EsNamingProvider<Ctx = undefined> {
    partRef(ctx?: Ctx): PartRefNaming;
    changeRequest(ctx?: Ctx): ChangeRequestNaming;
}

export class StaticEsNaming implements EsNamingProvider {
    private readonly _partRef: PartRefNaming;
    private readonly _changeRequest: ChangeRequestNaming;

    constructor({
        partRef,
        changeRequest,
    }: {
        partRef: PartRefNaming;
        changeRequest: ChangeRequestNaming;
    }) {
        this._partRef = partRef;
        this._changeRequest = changeRequest;
    }

    partRef(): PartRefNaming {
        return this._partRef;
    }
    changeRequest(): ChangeRequestNaming {
        return this._changeRequest;
    }
}

export interface EsServerConfig {
    rolePolicies: AppRolePolicies;
    storePath: string;
    pool: DbPool;
    dao: DaoSet;
    control: ControllerSet;
    naming: EsNamingProvider;
}

export interface EsSimpleAppConfig {
    prefix: string;
    cors: boolean;
    gql: EsGraphQLConfig;
    config: EsServerConfig;
}

export function buildSimpleEsApp({ prefix, cors, gql, config }: EsSimpleAppConfig): Koa {
    const app = new Koa();

    app.use(bodyParserMiddleware);
    if (cors) app.use(corsMiddleware);

    const login = passwordLoginMiddleware(config);
    const document = documentMiddlewares(config);
    const firstAdmin = firstAdminMiddleware(config);

    const preAuthRouter = new Router({ prefix });
    preAuthRouter.post('/login', login);
    preAuthRouter.get('/first_admin', firstAdmin.get);
    preAuthRouter.post('/first_admin', firstAdmin.post);
    preAuthRouter.get('/document/download', document.download);
    app.use(preAuthRouter.routes());

    app.use(requireAuthMiddleware); // everything passed this point requires auth

    const postAuthRouter = new Router({ prefix });
    postAuthRouter.get('/check_token', checkTokenMiddleware);
    postAuthRouter.get('/document/download_token', document.downloadToken);
    postAuthRouter.post('/document/upload', document.upload);
    app.use(postAuthRouter.routes());

    app.use(graphQLMiddleware(gql, config));

    return app;
}
