import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import Vue from 'vue';
import VueApollo from 'vue-apollo';
import store from './store';

const host = process.env.VUE_APP_API_HOST || window.location.hostname;
const port = process.env.VUE_APP_API_PORT || 3000;

// HTTP connection to the API
const httpLink = createHttpLink({
    uri: `http://${host}:${port}/graphql`,
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
const cache = new InMemoryCache();

// Create the apollo client
export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache,
});

Vue.use(VueApollo);

export const apolloProvider = new VueApollo({
    defaultClient: apolloClient,
});
