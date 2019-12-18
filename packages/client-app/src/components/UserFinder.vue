<template>
    <v-card>
        <v-card-title>
            <v-text-field
                v-model="searchPhrase"
                outline
                autofocus
                label="search for name or email"
                append-icon="mdi-search"
            ></v-text-field>
        </v-card-title>
        <v-card-text>
            <v-data-table
                :headers="userHeaders"
                :items="users"
                :loading="loading"
                :server-items-length="totalUsers"
                :options-sync="tableOptions"
            >
            </v-data-table>
        </v-card-text>
    </v-card>
</template>

<script>
import debounce from 'lodash.debounce';
import gql from 'graphql-tag';
import { apolloClient } from '../apollo';

const SEARCH = gql`
    query SearchUsers($phrase: String, $offset: Int, $limit: Int) {
        userSearch(phrase: $phrase, offset: $offset, limit: $limit) {
            count
            users {
                id
                name
                email
                fullName
            }
        }
    }
`;

export default {
    props: {
        initialSearch: {
            type: Object,
            default: () => ({
                phrase: '',
            }),
            validator: function(value) {
                return typeof value.phrase === 'string';
            },
        },
    },
    data() {
        return {
            searchPhrase: this.initialSearch.phrase,
            users: [],
            userHeaders: [
                { text: 'Id', value: 'name' },
                { text: 'E-Mail', value: 'email' },
                { text: 'Name', value: 'fullName' },
            ],
            tableOptions: {},
            totalUsers: 0,
            loading: false,
            debouncedGqlSearch: null,
        };
    },
    watch: {
        searchPhrase() {
            this.debouncedGqlSearch();
        },
        tableOptions() {
            this.gqlSearch();
        },
    },
    created() {
        this.debouncedGqlSearch = debounce(this.gqlSearch, 500);
    },
    methods: {
        async gqlSearch() {
            this.loading = true;
            const { page, itemsPerPage } = this.tableOptions;
            const res = await apolloClient.query({
                query: SEARCH,
                variables: {
                    phrase: this.searchPhrase,
                    offset: page,
                    limit: itemsPerPage,
                },
            });
            this.users = res.data.userSearch.users;
            this.totalUsers = res.data.count;
            this.loading = false;
        },
    },
};
</script>
