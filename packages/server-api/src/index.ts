import Router from '@koa/router';
import Koa from 'koa';
import { EsRolePolicies, PartRefNaming, ChangeRequestNaming } from '@engspace/core';
import { EsDaoSet, DbPool } from '@engspace/server-db';
import { buildEsControlSet, EsControlSet } from './control';
import { EsKoa, EsKoaState, EsKoaCustom } from './es-koa';
import {
    connectDbMiddleware,
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

export { EsControlSet, buildEsControlSet };
export { EsContext } from './control';
export { UserControl } from './control/user';
export { ChangeControl } from './control/change';
export { PartControl } from './control/part';
export { PartFamilyControl } from './control/part-family';
export { ProjectControl } from './control/project';
export { signJwt, verifyJwt } from './crypto';
export { EsKoa, EsKoaContext, EsKoaMiddleware, EsKoaState, EsKoaCustom } from './es-koa';
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
export { EsGqlContext } from './graphql/context';
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
export { generateCryptoPassword } from './util';

export interface EsNamingProvider<CtxT = undefined> {
    partRef(ctx?: CtxT): PartRefNaming;
    changeRequest(ctx?: CtxT): ChangeRequestNaming;
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

export interface EsServerRuntime<
    DaoT extends EsDaoSet = EsDaoSet,
    ControlT extends EsControlSet = EsControlSet
> {
    pool: DbPool;
    dao: DaoT;
    control: ControlT;
}

export interface EsServerConfig<
    RolePoliciesT extends EsRolePolicies = EsRolePolicies,
    NamingCtxT = undefined
> {
    storePath: string;
    rolePolicies: RolePoliciesT;
    naming: EsNamingProvider<NamingCtxT>;
}

export interface EsSimpleAppParams {
    prefix: string;
    cors: boolean;
    gql: EsGraphQLConfig;
    runtime: EsServerRuntime;
    config: EsServerConfig;
    jwtSecret: string;
}

export function buildSimpleEsApp({
    prefix,
    cors,
    gql,
    runtime,
    config,
    jwtSecret,
}: EsSimpleAppParams): EsKoa {
    const app: EsKoa = new Koa();

    app.context.runtime = runtime;
    app.context.config = config;

    app.use(bodyParserMiddleware);
    if (cors) app.use(corsMiddleware);

    app.use(connectDbMiddleware);

    const login = passwordLoginMiddleware(jwtSecret);
    const document = documentMiddlewares;

    const preAuthRouter = new Router<EsKoaState, EsKoaCustom>({ prefix });
    preAuthRouter.post('/login', login);
    preAuthRouter.get('/first_admin', firstAdminMiddleware.get);
    preAuthRouter.post('/first_admin', firstAdminMiddleware.post);
    preAuthRouter.get('/document/download', document.download);
    app.use(preAuthRouter.routes());

    app.use(requireAuthMiddleware(jwtSecret)); // everything passed this point requires auth

    const postAuthRouter = new Router<EsKoaState, EsKoaCustom>({ prefix });
    postAuthRouter.get('/check_token', checkTokenEndpoint);
    postAuthRouter.get('/document/download_token', document.downloadToken);
    postAuthRouter.post('/document/upload', document.upload);
    app.use(postAuthRouter.routes());

    app.use(graphQLEndpoint(gql));

    return app;
}
