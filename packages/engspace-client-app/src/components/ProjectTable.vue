<template>
    <v-card>
        <v-card-title>
            <v-text-field v-model="searchPhrase" label="Find project" append-icon="mdi-magnify">
            </v-text-field>
        </v-card-title>
        <v-card-text>
            <v-data-table
                :headers="headers"
                :items="projects"
                :options.sync="options"
                :server-items-length="totalProjects"
                :loading="loading"
            >
                <template v-slot:item="props">
                    <router-link :to="`/project/${props.item.code}`" tag="tr" class="link_pointer">
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
                return value.every(v => ['name', 'code', 'description'].includes(v));
            },
        },
    },
    data() {
        return {
            searchPhrase: '',

            projects: [],
            totalProjects: 0,
            loading: false,
            options: { page: 0, itemsPerPage: 0 },

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
        headers(): Column[] {
            return this.columns.map(c => this.allColumns[c as string]);
        },
    },
    watch: {
        searchPhrase() {
            this.debouncedSearchProjects();
        },
        options: {
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
            const { page, itemsPerPage } = this.options;
            const query = {
                search: this.searchPhrase,
                offset: (page - 1) * itemsPerPage,
                limit: itemsPerPage,
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
