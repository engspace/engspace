import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { provide } from '@vue/composition-api';
import { DefaultApolloClient } from '@vue/apollo-composable';
import { apiHost, apiPort } from './api';
import { useAuth } from './auth';

// HTTP connection to the API
const httpLink = createHttpLink({
    uri: `http://${apiHost}:${apiPort}/api/graphql`,
    useGETForQueries: true,
});

const authLink = new ApolloLink((operation, forward) => {
    const auth = useAuth();
    if (!auth.loggedIn.value) {
        throw new Error('Unauthenticated graphql request');
    }
    operation.setContext({
        headers: { Authorization: `Bearer ${auth.token.value}` },
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

export function provideApollo() {
    provide(DefaultApolloClient, apolloClient);
}
