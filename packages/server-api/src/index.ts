import Router from '@koa/router';
import Koa from 'koa';
import { AppRolePolicies, PartRefNaming, ChangeRequestNaming, AuthToken } from '@engspace/core';
import { DaoSet, DbPool } from '@engspace/server-db';
import { buildControllerSet, ControllerSet } from './control';
import { EsKoa } from './es-koa';
import {
    requireAuthMiddleware,
    documentMiddlewares,
    firstAdminMiddleware,
    graphQLEndpoint,
    passwordLoginMiddleware,
    bodyParserMiddleware,
    corsMiddleware,
    checkTokenEndpoint,
    EsGraphQLConfig,
} from './middlewares';
import { generateCryptoPassword } from './util';

export { ControllerSet, buildControllerSet };
export { ApiContext } from './control';
export { UserControl } from './control/user';
export { ChangeControl } from './control/change';
export { PartControl } from './control/part';
export { PartFamilyControl } from './control/part-family';
export { ProjectControl } from './control/project';
export { signJwt, verifyJwt } from './crypto';
export { EsKoa, EsKoaContext, EsKoaMiddleware, EsKoaState } from './es-koa';
export {
    extractBearerToken,
    connectDbMiddleware,
    checkAuthMiddleware,
    checkAuthOrDefaultMiddleware,
    checkTokenEndpoint,
    requireAuthMiddleware,
    documentMiddlewares,
    firstAdminMiddleware,
    EsGraphQLConfig,
    graphQLEndpoint,
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
export { isUser } from './type-guards';

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

export function buildSimpleEsApp(
    { prefix, cors, gql, config }: EsSimpleAppConfig,
    jwtSecret?: string
): EsKoa {
    const app = new Koa();

    if (!jwtSecret) {
        jwtSecret = generateCryptoPassword();
    }

    app.use(bodyParserMiddleware);
    if (cors) app.use(corsMiddleware);

    const login = passwordLoginMiddleware(config, jwtSecret);
    const document = documentMiddlewares(config);
    const firstAdmin = firstAdminMiddleware(config);

    const preAuthRouter = new Router({ prefix });
    preAuthRouter.post('/login', login);
    preAuthRouter.get('/first_admin', firstAdmin.get);
    preAuthRouter.post('/first_admin', firstAdmin.post);
    preAuthRouter.get('/document/download', document.download);
    app.use(preAuthRouter.routes());

    app.use(requireAuthMiddleware(jwtSecret)); // everything passed this point requires auth

    const postAuthRouter = new Router({ prefix });
    postAuthRouter.get('/check_token', checkTokenEndpoint);
    postAuthRouter.get('/document/download_token', document.downloadToken);
    postAuthRouter.post('/document/upload', document.upload);
    app.use(postAuthRouter.routes());

    app.use(graphQLEndpoint(gql, config));

    return app;
}
