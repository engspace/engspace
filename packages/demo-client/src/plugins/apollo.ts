import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import Vue from 'vue';
import VueApollo from 'vue-apollo';
import { apiHost, apiPort } from '../api';
import store from '../store';

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
    dataIdFromObject: (obj) => obj.id || null,
});

// Create the apollo client
export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache,
});

Vue.use(VueApollo);

export default new VueApollo({
    defaultClient: apolloClient,
});
