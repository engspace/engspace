<template>
    <div>
        <v-alert v-if="error.length" v-model="alert" type="error">
            {{ error }}
        </v-alert>
        <v-expansion-panels v-else>
            <v-expansion-panel>
                <v-expansion-panel-header>
                    <div>
                        <strong>{{ project.name }}</strong>
                        - {{ project.code }}
                    </div>
                    <v-spacer />
                    <v-btn
                        v-if="isManager"
                        icon
                        small
                        class="grey--text text--darker-5"
                        :to="`/project/${project.code}/edit`"
                    >
                        <v-icon left>mdi-pencil</v-icon> Edit
                    </v-btn>
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                    <v-container>
                        <v-layout row wrap>
                            <v-flex xs12 md3 lg2>
                                <v-card>
                                    <v-card-title>Description</v-card-title>
                                    <v-card-text>
                                        {{ project.description ? project.description : '(Blank)' }}
                                    </v-card-text>
                                </v-card>
                            </v-flex>
                            <v-flex xs12 md9 lg10>
                                <v-card>
                                    <v-card-title>Team members</v-card-title>
                                    <v-card-text>
                                        <v-data-table
                                            :items="project.members"
                                            :headers="memberHeaders"
                                        >
                                            <template v-slot:item="props">
                                                <tr>
                                                    <td>
                                                        {{ props.item.user.fullName }}
                                                    </td>
                                                    <td>
                                                        {{ memberRoles(props.item) }}
                                                    </td>
                                                    <td>
                                                        <a
                                                            :href="
                                                                `mailto:${props.item.user.email}`
                                                            "
                                                        >
                                                            <v-icon>mdi-email</v-icon>
                                                        </a>
                                                    </td>
                                                </tr>
                                            </template>
                                        </v-data-table>
                                    </v-card-text>
                                </v-card>
                            </v-flex>
                        </v-layout>
                    </v-container>
                </v-expansion-panel-content>
            </v-expansion-panel>
            <v-expansion-panel>
                <v-expansion-panel-header>
                    Part, Assemblies
                </v-expansion-panel-header>
                <v-expansion-panel-content></v-expansion-panel-content>
            </v-expansion-panel>
        </v-expansion-panels>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import HttpStatus from 'http-status-codes';
import { Project, ProjectMember } from '@engspace/core';
import { Api } from '../api';

export default Vue.extend({
    data() {
        return {
            error: '',
            alert: false,

            project: {},

            memberHeaders: [
                { text: 'Name', value: 'fullName' },
                { text: 'Roles', value: 'roles' },
                { text: 'Actions', value: 'actions' },
            ],
        };
    },
    computed: {
        isManager() {
            return this.$store.getters.user.manager;
        },
    },
    async created() {
        const { code } = this.$route.params;
        try {
            const res = await Api.get(`/projects/by-code/${code}`);
            this.project = new Project(res.data);
            this.alert = false;
        } catch (err) {
            if (err.response.status === HttpStatus.NOT_FOUND) {
                this.error = `project with code "${code}" doesn't exist`;
                this.alert = true;
            }
        }
    },
    methods: {
        memberRoles(member: ProjectMember) {
            const roles = [];
            if (member.leader) roles.push('Leader');
            if (member.designer) roles.push('Designer');
            return roles.join(', ');
        },
    },
});
</script>
