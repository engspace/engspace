<template>
    <search-panel v-model="search" title="Projects" :debounce-ms="500">
        <p v-if="error" class="red--text">{{ error }}</p>
        <v-data-table
            :headers="headers"
            :items="projectSearch.projects"
            :loading="$apollo.loading"
            :server-items-length="projectSearch.count"
            :items-per-page.sync="itemsPerPage"
            :page.sync="page"
            disable-sort
        >
            <template v-slot:item="{ item }">
                <router-link :to="projectRoute(item)" tag="tr" class="link">
                    <td v-for="h in headers" :key="h.value">
                        {{ item[h.value] }}
                    </td>
                </router-link>
            </template>
        </v-data-table>
    </search-panel>
</template>

<script>
import gql from 'graphql-tag';
import SearchPanel from './SearchPanel';
import { PROJECT_FIELDS } from '../graphql';

export default {
    components: {
        SearchPanel,
    },
    data() {
        return {
            search: '',
            page: 1,
            itemsPerPage: 10,
            headers: [
                { text: 'Name', value: 'name' },
                { text: 'Code', value: 'code' },
            ],
            projectSearch: {
                count: 0,
                projects: [],
            },
            error: '',
        };
    },
    apollo: {
        projectSearch: {
            query: gql`
                query SearchProjects($search: String!, $offset: Int!, $limit: Int!) {
                    projectSearch(search: $search, offset: $offset, limit: $limit) {
                        count
                        projects {
                            ...ProjectFields
                        }
                    }
                }
                ${PROJECT_FIELDS}
            `,
            variables() {
                return {
                    search: this.search,
                    offset: (this.page - 1) * this.itemsPerPage,
                    limit: this.itemsPerPage,
                };
            },
            error(error) {
                this.error = error.message;
            },
        },
    },
    methods: {
        projectRoute(project) {
            return `/project/by-code/${project.code}`;
        },
    },
};
</script>
