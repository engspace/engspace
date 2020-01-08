import { AppRolePolicies } from '@engspace/core';
import { DbPool } from '@engspace/server-db';
import { ApolloLogExtension } from 'apollo-log';
import { ApolloServer } from 'apollo-server-koa';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { attachDb, gqlContextFactory } from './internal';
import { resolvers } from './resolvers';
import { typeDefs } from './schema';

export { setupAuth } from './auth';
export { setupDocumentAPI } from './document';
export { setupPlaygroundEndpoint, setupPlaygroundLogin } from './playground';

export function initGqlApp(): Koa {
    const app = new Koa();
    app.use(
        bodyParser({
            enableTypes: ['json', 'text', 'form'],
        })
    );
    return app;
}

export function setupGqlEndpoint(app: Koa, pool: DbPool, rolePolicies: AppRolePolicies): void {
    app.use(attachDb(pool, '/graphql'));

    const extensions = [(): ApolloLogExtension => new ApolloLogExtension()];
    const graphQL = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: false,
        playground: false,
        extensions,
        formatError(err) {
            console.log(err);
            return err;
        },
        context: gqlContextFactory(rolePolicies),
    });
    app.use(
        graphQL.getMiddleware({
            path: '/graphql',
        })
    );
}
