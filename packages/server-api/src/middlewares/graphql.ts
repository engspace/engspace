import { ApolloLogExtension } from 'apollo-log';
import { ApolloServer } from 'apollo-server-koa';
import { GraphQLSchema } from 'graphql';

import { AuthToken } from '@engspace/core';
import { Db } from '@engspace/server-db';

import { EsServerConfig, EsServerRuntime } from '..';
import { EsContext } from '../control';
import { EsKoaMiddleware } from '../es-koa';
import { EsGqlContext, gqlContextFactory } from '../graphql/context';
import { makeLoaders } from '../graphql/loaders';

export interface EsGraphQLConfig {
    path: string;
    schema: GraphQLSchema;
    logging: boolean;
}

export function graphQLEndpoint({ path, schema, logging }: EsGraphQLConfig): EsKoaMiddleware {
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
        context: gqlContextFactory,
    });

    return gqlServer.getMiddleware({
        path,
    });
}

export interface TestGqlConfig {
    db: Db;
    auth: AuthToken;
    schema: GraphQLSchema;
    runtime: EsServerRuntime;
    config: EsServerConfig;
}

export function buildTestGqlServer({
    db,
    auth,
    schema,
    runtime,
    config,
}: TestGqlConfig): ApolloServer {
    return new ApolloServer({
        schema,
        introspection: false,
        playground: false,
        context: (): EsGqlContext => {
            const ctx: EsContext = {
                db,
                auth,
                runtime,
                config,
            };
            return {
                loaders: makeLoaders(ctx),
                ...ctx,
            };
        },
    });
}
