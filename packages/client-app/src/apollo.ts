import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient, ApolloError } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { GraphQLError } from 'graphql';
import get from 'lodash.get';
import Vue from 'vue';
import VueApollo from 'vue-apollo';
import { apiHost, apiPort } from './api';
import store from './store';

// HTTP connection to the API
const httpLink = createHttpLink({
    uri: `http://${apiHost}:${apiPort}/api/graphql`,
    useGETForQueries: true,
});

const authLink = new ApolloLink((operation, forward) => {
    if (!store.getters.isAuth) {
        throw new Error('Unauthenticated graphql request');
    }
    operation.setContext({
        headers: { Authorization: `Bearer ${store.state.token}` },
    });
    return forward(operation);
});

// Cache implementation
const cache = new InMemoryCache({
    dataIdFromObject: obj => obj.id || null,
});

// Create the apollo client
export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache,
});

Vue.use(VueApollo);

export const apolloProvider = new VueApollo({
    defaultClient: apolloClient,
});

export function extractGQLError(err: ApolloError): GraphQLError {
    const errorPaths = [
        'graphQLErrors[0].message',
        'networkError.result.errors[0].message',
        'response.errors[0].message',
        'message',
    ];
    const path = errorPaths.find(path => get(err, path)) as string;
    return get(err, path);
}

export function extractGQLErrors(err: ApolloError): GraphQLError[] {
    const errors: GraphQLError[] = [];
    const errorPaths = ['graphQLErrors', 'networkError.result.errors', 'response.errors'];
    const paths = errorPaths.filter(path => get(err, path));
    paths.forEach(path => errors.push(...get(err, path)));
    return errors;
}
