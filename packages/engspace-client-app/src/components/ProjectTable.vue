<template>
    <v-card>
        <v-card-title>
            <v-text-field v-model="searchPhrase">
                <v-icon slot="append">
                    search
                </v-icon>
            </v-text-field>
        </v-card-title>
        <v-card-text>
            <v-data-table
                :headers="dataColumns"
                :items="projects"
                :loading="loading"
                :total-items="totalProjects"
                :pagination.sync="pagination"
            >
                <template v-slot:items="props">
                    <router-link
                        :to="`/project/${props.item.code}`"
                        tag="tr"
                        class="link_pointer"
                    >
                        <td v-for="(col, ind) in columns" :key="ind">
                            {{ props.item[col] }}
                        </td>
                    </router-link>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>

<script lang="ts">
import Vue from 'vue';
import debounce from 'lodash.debounce';
import { Api } from '../api';

interface Search {
    search: string;
    offset: number;
    limit: number;
}

interface Column {
    text: string;
    value: string;
}

export default Vue.extend({
    props: {
        columns: {
            type: Array,
            default: () => ['name', 'code'],
            validator(value: string[]) {
                return value.every(v =>
                    ['name', 'code', 'description'].includes(v)
                );
            },
        },
    },
    data() {
        return {
            searchPhrase: '',

            loading: false,
            pagination: {} as { page: number; rowsPerPage: number },
            totalProjects: 0,
            projects: [],

            allColumns: {
                name: {
                    text: 'Name',
                    value: 'name',
                },
                code: {
                    text: 'Code',
                    value: 'code',
                },
                description: {
                    text: 'Description',
                    value: 'description',
                },
            } as { [index: string]: Column },

            debouncedSearchProjects: async () => {},
        };
    },
    computed: {
        dataColumns(): Column[] {
            return this.columns.map(c => this.allColumns[c as string]);
        },
    },
    watch: {
        searchPhrase() {
            this.debouncedSearchProjects();
        },
        pagination: {
            handler() {
                this.searchProjects();
            },
            deep: true,
        },
    },
    created() {
        this.debouncedSearchProjects = debounce(this.searchProjects, 500);
    },
    mounted() {
        this.searchProjects();
    },
    methods: {
        async searchProjects() {
            this.loading = true;
            const { page, rowsPerPage } = this.pagination;
            const query = {
                search: this.searchPhrase,
                offset: (page - 1) * rowsPerPage,
                limit: rowsPerPage,
            };
            const { projects, total } = await this.apiFetch(query);
            this.projects = projects;
            this.totalProjects = total;
            this.loading = false;
        },
        async apiFetch(query: Search) {
            const resp = await Api.get(`/projects${Api.buildQuery(query)}`);
            return {
                projects: resp.data,
                total: parseInt(resp.headers['total-count'], 10),
            };
        },
    },
});
</script>

<style>
.link_pointer {
    cursor: pointer;
}
</style>
