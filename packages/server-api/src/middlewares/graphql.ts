import { ApolloLogExtension } from 'apollo-log';
import { ApolloServer } from 'apollo-server-koa';
import { GraphQLSchema } from 'graphql';

import { AuthToken } from '@engspace/core';
import { Db } from '@engspace/server-db';

import { EsServerConfig } from '..';
import { ApiContext } from '../control';
import { EsKoaMiddleware } from '../es-koa';
import { GqlContext, gqlContextFactory } from '../graphql/context';
import { makeLoaders } from '../graphql/loaders';

export interface EsGraphQLConfig {
    path: string;
    schema: GraphQLSchema;
    logging: boolean;
}

export function graphQLEndpoint(
    { path, schema, logging }: EsGraphQLConfig,
    config: EsServerConfig
): EsKoaMiddleware {
    /* istanbul ignore next */
    const extensions = logging
        ? [
              (): ApolloLogExtension =>
                  new ApolloLogExtension({ prefix: 'Engspace API', timestamp: true }),
          ]
        : [];
    /* istanbul ignore next */
    const formatError = logging
        ? (err: Error): Error => {
              console.log(err);
              return err;
          }
        : undefined;
    const gqlServer = new ApolloServer({
        schema,
        introspection: false,
        playground: false,
        extensions,
        formatError,
        context: gqlContextFactory(config),
    });

    return gqlServer.getMiddleware({
        path,
    });
}

export interface TestGqlConfig {
    db: Db;
    auth: AuthToken;
    schema: GraphQLSchema;
    config: EsServerConfig;
}

export function buildTestGqlServer({ db, auth, schema, config }: TestGqlConfig): ApolloServer {
    return new ApolloServer({
        schema,
        introspection: false,
        playground: false,
        context: (): GqlContext => {
            const ctx: ApiContext = {
                db,
                auth,
                config: config,
            };
            return {
                loaders: makeLoaders(ctx, config.control),
                ...ctx,
            };
        },
    });
}
