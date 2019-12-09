<template>
    <v-form @submit.prevent="createProject">
        <v-container fluid>
            <v-layout row wrap>
                <v-flex d-flex xs12 sm8 tag="h1">
                    Create Project
                </v-flex>
                <v-flex d-flex xs6 sm2>
                    <v-btn to="/">
                        Abort
                    </v-btn>
                </v-flex>
                <v-flex d-flex xs6 sm2>
                    <v-btn type="submit">
                        Done
                    </v-btn>
                </v-flex>
            </v-layout>
            <v-layout>
                <v-flex>
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
                                        hide-actions
                                        :items="project.members"
                                        :headers="memberHeaders"
                                    >
                                        <template v-slot:items="props">
                                            <td>
                                                {{ props.item.user.fullName }}
                                            </td>
                                            <td>
                                                <v-checkbox
                                                    v-model="props.item.leader"
                                                    hide-details
                                                />
                                            </td>
                                            <td>
                                                <v-checkbox
                                                    v-model="props.item.designer"
                                                    hide-details
                                                />
                                            </td>
                                            <td>
                                                <v-icon small @click="removeMember(props.item)">
                                                    mdi-delete
                                                </v-icon>
                                            </td>
                                        </template>
                                    </v-data-table>
                                    <v-divider />
                                    <v-text-field
                                        v-model="searchPhrase"
                                        hide-details
                                        label="Search new members"
                                        class="pr-1"
                                    >
                                        <v-icon slot="append">
                                            mdi-search
                                        </v-icon>
                                    </v-text-field>
                                    <v-data-table
                                        :items="searchCandidates"
                                        :headers="searchHeaders"
                                        :loading="searchLoad"
                                        :total-items="searchCount"
                                        :pagination.sync="searchPag"
                                    >
                                        <template v-slot:items="props">
                                            <td>{{ props.item.fullName }}</td>
                                            <td>{{ props.item.email }}</td>
                                            <td>
                                                <v-icon small @click="addMember(props.item)">
                                                    mdi-add
                                                </v-icon>
                                            </td>
                                        </template>
                                    </v-data-table>
                                </v-card-text>
                            </v-card>
                        </v-flex>
                    </v-layout>
                </v-flex>
            </v-layout>
        </v-container>
    </v-form>
</template>

<script lang="ts">
import Vue from 'vue';
import debounce from 'lodash.debounce';
import HttpStatus from 'http-status-codes';
import { Id, ProjectMember, User, Project } from '@engspace/core';
import { Api } from '../api';

export default Vue.extend({
    data() {
        return {
            project: new Project(),

            memberHeaders: [
                { text: 'Name', value: 'user.fullName' },
                { text: 'Leader', value: 'leader' },
                { text: 'Designer', value: 'designer' },
                { text: '', value: 'remove' },
            ],

            searchPhrase: '',
            searchPag: {} as { page: number; rowsPerPage: number },
            searchLoad: false,
            searchResult: [] as User[],
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
        searchCandidates(): User[] {
            const proj = this.project;
            return this.searchResult.filter(u => proj.members.every(m => m.user.id !== u.id));
        },
    },
    watch: {
        searchPhrase() {
            this.debouncedMemberSearch();
        },
        searchPag: {
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
                const { page, rowsPerPage } = this.searchPag;
                const query = {
                    search: this.searchPhrase,
                    offset: (page - 1) * rowsPerPage,
                    limit: rowsPerPage,
                };
                const resp = await Api.get(Api.query('/users', query));
                this.searchResult = resp.data;
                this.searchCount = parseInt(resp.headers['total-count'], 10);
                this.searchLoad = false;
            }
        },
        addMember(user: User) {
            this.project.members.push({
                user,
                leader: false,
                designer: false,
            });
        },
        removeMember(member: ProjectMember) {
            const proj = this.project;
            proj.members = proj.members.filter(m => m.user.id !== member.user.id);
        },
        async createProject() {
            const proj = new Project({
                ...this.project,
                members: this.project.members.map(m => ({
                    ...m,
                    user: { id: m.user.id as Id },
                })),
            });
            const res = await Api.post('/projects', proj);
            if (res.status !== HttpStatus.OK) {
                // error
            } else {
                this.$router.push(`/project/${res.data.code}`);
            }
        },
    },
});
</script>

<style></style>
