<template>
    <v-card>
        <v-card-title>
            {{ title }}
            <v-spacer></v-spacer>
            <v-text-field
                v-model="searchPhrase"
                outline
                autofocus
                label="search by login, name or email"
                append-icon="mdi-search"
            ></v-text-field>
        </v-card-title>
        <v-data-table
            :headers="userHeaders"
            :items="users"
            :loading="loading"
            :server-items-length="totalUsers"
            :options-sync="tableOptions"
            disable-sort
        >
            <template v-slot:item="{ item }">
                <tr
                    :class="{ primary: selectable && item.id === selectedId }"
                    @click="selectUser(item)"
                >
                    <td v-for="col in dataHeaders" :key="col.value">
                        {{ item[col.value] }}
                    </td>
                    <slot name="action" :user="item"></slot>
                </tr>
            </template>
        </v-data-table>
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

const colText = {
    name: 'Login',
    email: 'E-Mail',
    fullName: 'Name',
};

export default {
    props: {
        columns: {
            type: Array,
            default: () => ['name', 'email', 'fullName'],
            validate: val => val.every(v => v in colText),
        },
        initialSearch: {
            type: String,
            default: '',
        },
        selectable: {
            type: Boolean,
            default: false,
        },
        title: {
            type: String,
            default: '',
        },
        value: {
            type: String,
            default: '',
        },
        emptyAll: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            searchPhrase: this.initialSearch.phrase,
            users: [],
            tableOptions: {},
            selectedId: this.value,
            totalUsers: 0,
            loading: false,
            debouncedGqlSearch: null,
        };
    },
    computed: {
        hasActionSlot() {
            return !!this.$slots['action'];
        },
        dataHeaders() {
            return this.columns.map(c => ({ text: colText[c], value: c }));
        },
        userHeaders() {
            const headers = this.dataHeaders;
            if (this.hasActionSlot) {
                headers.push({ text: 'Action', value: 'action' });
            }
            return headers;
        },
    },
    watch: {
        searchPhrase() {
            this.debouncedGqlSearch();
        },
        tableOptions() {
            this.gqlSearch();
        },
        selectedId() {
            if (this.selectable) {
                this.$emit('input', this.selectedId);
            }
        },
    },
    created() {
        this.debouncedGqlSearch = debounce(this.gqlSearch, 500);
        console.log(this.emptyAll);
        if (this.emptyAll || this.searchPhrase) {
            this.gqlSearch();
        }
    },
    methods: {
        async gqlSearch() {
            if (!this.emptyAll && !this.searchPhrase) {
                this.users = [];
                this.totalUsers = 0;
                this.selectedId = '';
                return;
            }
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
            if (this.selectedId && this.users.filter(u => u.id === this.selectedId).length === 0) {
                this.selectedId = '';
            }
            this.loading = false;
        },
        notifyUpdate(user) {
            const ind = this.users.findIndex(u => u.id === user.id);
            if (ind !== -1) {
                this.users.splice(ind, 1, user);
            }
        },
        selectUser(item) {
            if (this.selectable) {
                this.selectedId = item.id;
            }
        },
    },
};
</script>
