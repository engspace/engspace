<template>
    <div>
        <v-expansion-panels v-model="panel">
            <search-panel title="Projects" :debounce-ms="500" @input="searchProjects">
                <p v-if="projectError" class="red--text">{{ projectError }}</p>
                <v-data-table
                    :headers="projectHeaders"
                    :items="projects"
                    :loading="projectLoading"
                    :server-items-length="totalProjects"
                    :options.sync="projectTableOptions"
                    disable-sort
                >
                    <template v-slot:item="{ item }">
                        <router-link :to="projectRoute(item)" tag="tr" class="link">
                            <td v-for="h in projectHeaders" :key="h.value">
                                {{ item[h.value] }}
                            </td>
                        </router-link>
                    </template>
                </v-data-table>
            </search-panel>
        </v-expansion-panels>
    </div>
</template>

<script>
import SearchPanel from '../components/SearchPanel.vue';
import gql from 'graphql-tag';
import { PROJECT_FIELDS } from '../graphql';
import { apolloClient, extractGQLErrors } from '../apollo';
import { isApolloError } from 'apollo-client';

const SEARCH_PROJECT = gql`
    query SearchProject($search: String!, $offset: Int!, $limit: Int!) {
        projectSearch(search: $search, offset: $offset, limit: $limit) {
            count
            projects {
                ...ProjectFields
            }
        }
    }
    ${PROJECT_FIELDS}
`;

export default {
    components: { SearchPanel },
    data() {
        const projectHeaders = [
            { text: 'Name', value: 'name' },
            { text: 'Code', value: 'code' },
        ];
        return {
            panel: null,
            projects: [],
            projectHeaders,
            totalProjects: 0,
            projectTableOptions: { page: 1, itemsPerPage: 10 },
            projectLoading: false,
            projectError: '',
        };
    },
    created() {
        this.searchProjects('');
    },
    methods: {
        projectRoute(project) {
            return `/project/by-code/${project.code}`;
        },
        async searchProjects(search) {
            this.projectLoading = true;
            try {
                const { page, itemsPerPage } = this.projectTableOptions;
                const resp = await apolloClient.query({
                    query: SEARCH_PROJECT,
                    variables: {
                        search,
                        offset: (page - 1) * itemsPerPage,
                        limit: itemsPerPage,
                    },
                });
                this.projects = resp.data.projectSearch.projects;
                this.totalProjects = resp.data.projectSearch.count;
                this.projectError = '';
            } catch (err) {
                this.projectError = err.message;
                if (isApolloError(err)) {
                    console.error(extractGQLErrors(err));
                }
            }
            this.projectLoading = false;
        },
    },
};
</script>
