<template>
    <v-container>
        <v-layout row wrap>
            <v-flex d-flex xs12 md4 pa-4>
                <v-layout row wrap align-start fill-height>
                    <v-flex d-flex xs12 sm6 md12 px-1>
                        <v-text-field v-model="project.name" label="Name" />
                    </v-flex>
                    <v-flex d-flex xs12 sm6 md12 px-1>
                        <v-text-field v-model="project.code" label="Code" />
                    </v-flex>
                    <v-flex d-flex xs12 md12 px-1>
                        <v-textarea v-model="project.description" label="Description" />
                    </v-flex>
                </v-layout>
            </v-flex>
            <v-flex d-flex xs12 md8 class="pa-4">
                <v-card>
                    <v-card-title>Team members</v-card-title>
                    <v-card-text>
                        <v-data-table
                            hide-default-footer
                            :items="project.members"
                            :headers="memberHeaders"
                        >
                            <template v-slot:item="props">
                                <tr>
                                    <td>{{ props.item.user.fullName }}</td>
                                    <td>
                                        <v-checkbox v-model="props.item.leader" hide-details />
                                    </td>
                                    <td>
                                        <v-checkbox v-model="props.item.designer" hide-details />
                                    </td>
                                    <td>
                                        <v-icon small @click="removeMember(props.item)">
                                            mdi-account-minus
                                        </v-icon>
                                    </td>
                                </tr>
                            </template>
                        </v-data-table>
                        <v-divider />
                        <v-text-field
                            v-model="searchPhrase"
                            hide-details
                            label="Search new members"
                            class="pr-1"
                            append-icon="mdi-magnify"
                        >
                        </v-text-field>
                        <v-data-table
                            :items="searchCandidates"
                            :headers="searchHeaders"
                            :loading="searchLoad"
                            :server-items-length="searchCount"
                            :options.sync="searchOptions"
                        >
                            <template v-slot:item="props">
                                <tr>
                                    <td>{{ props.item.fullName }}</td>
                                    <td>{{ props.item.email }}</td>
                                    <td>
                                        <v-icon small @click="addMember(props.item)">
                                            mdi-account-plus
                                        </v-icon>
                                    </td>
                                </tr>
                            </template>
                        </v-data-table>
                    </v-card-text>
                </v-card>
            </v-flex>
        </v-layout>
    </v-container>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import debounce from 'lodash.debounce';
import { IUser, IProjectMember, Project } from '@engspace/core';
import { Api } from '../api';

export default Vue.extend({
    name: 'ProjectEdit',
    props: {
        project: {
            type: Object as PropType<Project>,
            default: () => new Project(),
        },
    },
    data() {
        return {
            memberHeaders: [
                { text: 'Name', value: 'user.fullName' },
                { text: 'Leader', value: 'leader' },
                { text: 'Designer', value: 'designer' },
                { text: '', value: 'remove' },
            ],

            searchPhrase: '',
            searchOptions: {} as { page: number; itemsPerPage: number },
            searchLoad: false,
            searchResult: [] as IUser[],
            searchCount: 0,
            searchHeaders: [
                { text: 'Name', value: 'fullName' },
                { text: 'E-Mail', value: 'email' },
                { text: '', value: 'add' },
            ],

            debouncedMemberSearch: async () => {},
        };
    },
    computed: {
        searchCandidates(): IUser[] {
            const proj = this.project;
            return this.searchResult.filter(u => proj.members.every(m => m.user.id !== u.id));
        },
    },
    watch: {
        searchPhrase() {
            this.debouncedMemberSearch();
        },
        searchOptions: {
            handler() {
                this.memberSearch();
            },
            deep: true,
        },
    },
    created() {
        this.debouncedMemberSearch = debounce(this.memberSearch, 500);
    },
    methods: {
        async memberSearch() {
            if (this.searchPhrase === '') {
                this.searchResult = [];
                this.searchCount = 0;
                this.searchLoad = false;
            } else {
                this.searchLoad = true;
                const { page, itemsPerPage } = this.searchOptions;
                const query = {
                    search: this.searchPhrase,
                    offset: (page - 1) * itemsPerPage,
                    limit: itemsPerPage,
                };
                const resp = await Api.get(Api.query('/users', query));
                this.searchResult = resp.data;
                this.searchCount = parseInt(resp.headers['total-count'], 10);
                this.searchLoad = false;
            }
        },
        addMember(user: IUser) {
            this.project.members.push({
                user,
                leader: false,
                designer: false,
            });
        },
        removeMember(member: IProjectMember) {
            this.project.members = this.project.members.filter(m => m.user.id !== member.user.id);
        },
    },
});
</script>
