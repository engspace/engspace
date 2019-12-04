import Koa from 'koa';
import bodyParser from 'koa-bodyparser';

import { loginRouter, checkAuth } from './login';
import { ApolloServer } from 'apollo-server-koa';

import { typeDefs } from './schema';
import { resolvers } from './resolvers';

const app = new Koa();
const graphQL = new ApolloServer({
    typeDefs,
    resolvers,
});

app.use(
    bodyParser({
        enableTypes: ['json', 'text', 'form'],
    })
);

app.use(loginRouter.routes());
app.use(loginRouter.allowedMethods());

app.use(checkAuth);
graphQL.applyMiddleware({
    app,
});

export { app };
