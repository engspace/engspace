import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { provide } from '@vue/composition-api';
import { DefaultApolloClient } from '@vue/apollo-composable';
import { url as apiUrl, authHeader } from './api';

// HTTP connection to the API
const httpLink = createHttpLink({
    uri: apiUrl('/api/graphql'),
    useGETForQueries: true,
});

const authLink = new ApolloLink((operation, forward) => {
    operation.setContext({
        headers: authHeader(),
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

export function provideApollo() {
    provide(DefaultApolloClient, apolloClient);
}
