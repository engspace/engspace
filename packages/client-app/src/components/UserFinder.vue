<template>
    <v-card>
        <v-card-title class="pa-2">
            <v-container fluid pa-0>
                <v-layout row>
                    <v-flex xs8>
                        <v-text-field
                            v-model="searchPhrase"
                            outline
                            autofocus
                            label="Search name or email"
                            hide-details
                            full-width
                            class="px-2"
                        >
                            <v-icon slot="append">
                                mdi-search
                            </v-icon>
                        </v-text-field>
                    </v-flex>
                    <v-flex xs2>
                        <v-select
                            v-model="searchAdmin"
                            label="Admin"
                            dense
                            :items="triState"
                            class="px-2"
                            @change="apiSearch"
                        />
                    </v-flex>
                    <v-flex xs2>
                        <v-select
                            v-model="searchManager"
                            label="Manager"
                            dense
                            :items="triState"
                            class="px-2"
                            @change="apiSearch"
                        />
                    </v-flex>
                </v-layout>
            </v-container>
        </v-card-title>
        <v-card-text>
            <v-data-table
                :headers="userHeaders"
                :items="users"
                :loading="loading"
                :server-items-length="totalUsers"
                :options.sync="tableOptions"
            >
                <template v-slot:item="props">
                    <tr>
                        <td>{{ props.item.name }}</td>
                        <td>{{ props.item.email }}</td>
                        <td>{{ props.item.fullName }}</td>
                    </tr>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>

<script lang="ts">
import Vue from 'vue';
import debounce from 'lodash.debounce';
import { Api } from '../api';

const dontCare = { text: "Don't care", value: '' };
const yes = { text: 'Yes', value: 'true' };
const no = { text: 'No', value: 'false' };

interface Search {
    search: string;
    admin: string;
    manager: string;
    offset: number;
    limit: number;
}

export default Vue.extend({
    name: 'UserFinder',
    data() {
        // const debouncedApiSearch: () => Promise<void> = null;
        return {
            searchPhrase: '',
            searchAdmin: '',
            searchManager: '',
            triState: [dontCare, yes, no],

            loading: false,
            tableOptions: {} as { page: number; itemsPerPage: number },
            totalUsers: 0,
            users: [],
            userHeaders: [
                { text: 'Id', value: 'name' },
                { text: 'E-Mail', value: 'email' },
                { text: 'Name', value: 'fullName' },
            ],
            debouncedApiSearch: async () => {},
        };
    },
    watch: {
        searchPhrase() {
            this.debouncedApiSearch();
        },
        tableOptions: {
            handler() {
                this.apiSearch();
            },
            deep: true,
        },
    },
    created() {
        this.debouncedApiSearch = debounce(this.apiSearch, 500);
    },
    mounted() {
        this.apiSearch();
    },
    methods: {
        async apiSearch() {
            this.loading = true;
            const { page, itemsPerPage } = this.tableOptions;
            const query = {
                search: this.searchPhrase,
                admin: this.searchAdmin,
                manager: this.searchManager,
                offset: (page - 1) * itemsPerPage,
                limit: itemsPerPage,
            };
            const { users, total } = await this.apiFetch(query);
            this.users = users;
            this.totalUsers = total;
            this.loading = false;
        },
        async apiFetch(query: Search) {
            const resp = await Api.get(`/users${Api.buildQuery(query)}`);
            return {
                users: resp.data,
                total: parseInt(resp.headers['total-count'], 10),
            };
        },
    },
});
</script>
