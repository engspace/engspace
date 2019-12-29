<template>
    <v-container fluid>
        <v-row>
            <v-col :cols="12" :md="5">
                <project-read :project="project"></project-read>
            </v-col>
            <v-col :cols="12" :md="7">
                <v-card>
                    <v-card-title>
                        Team members
                        <v-spacer></v-spacer>
                        <v-btn v-if="canEdit" @click="toggleMemberEdit()">
                            <v-icon>{{ memberEdit ? 'mdi-check' : 'mdi-pencil' }}</v-icon
                            >&nbsp;
                            {{ memberEdit ? 'Done' : 'Edit' }}
                        </v-btn>
                    </v-card-title>
                    <v-card-text>
                        <transition>
                            <project-member-read
                                v-if="!memberEdit"
                                ref="memberReadComp"
                                :members="project.members"
                            ></project-member-read>
                            <project-member-edit
                                v-if="memberEdit"
                                ref="memberEditComp"
                                :members="project.members"
                                :project-id="project.id"
                            ></project-member-edit>
                        </transition>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import { CProject } from '@engspace/core';
import { isApolloError } from 'apollo-client';
import gql from 'graphql-tag';

import ProjectMemberRead from '../components/ProjectMemberRead';
import ProjectMemberEdit from '../components/ProjectMemberEdit';
import ProjectRead from '../components/ProjectRead';
import { apolloClient, extractGQLError } from '../apollo';
import { MEMBER_FIELDS } from '../graphql';

const PROJECT_FIELDS = gql`
    fragment ProjectFields on Project {
        id
        code
        name
        description
        members {
            ...MemberFields
        }
    }
    ${MEMBER_FIELDS}
`;

const GET_PROJECT = gql`
    query GetProject($id: ID!) {
        project(id: $id) {
            ...ProjectFields
        }
    }
    ${PROJECT_FIELDS}
`;

const GET_PROJECT_BY_CODE = gql`
    query GetProjectByCode($code: String!) {
        projectByCode(code: $code) {
            ...ProjectFields
        }
    }
    ${PROJECT_FIELDS}
`;

export default {
    components: {
        ProjectMemberRead,
        ProjectMemberEdit,
        ProjectRead,
    },
    data() {
        return {
            project: new CProject(),
            memberEdit: false,
        };
    },
    computed: {
        canEdit() {
            return this.$store.getters.auth.userPerms.includes('project.patch');
        },
        memberActionIcon() {
            return this.memberEdit ? 'mdi-check' : 'mdi-pencil';
        },
        memberActionText() {
            return this.memberEdit ? 'Done' : 'Edit';
        },
    },
    async created() {
        const { path } = this.$route;
        try {
            if (path.includes('/by-code/')) {
                const { code } = this.$route.params;
                const resp = await apolloClient.query({
                    query: GET_PROJECT_BY_CODE,
                    variables: { code },
                });
                this.project = resp.data.projectByCode;
            } else {
                const { id } = this.$route.params;
                const resp = await apolloClient.query({
                    query: GET_PROJECT,
                    variables: { id },
                });
                this.project = resp.data.project;
            }
        } catch (err) {
            console.error(err);
            if (isApolloError(err)) {
                console.error(extractGQLError(err));
            }
        }
    },
    methods: {
        toggleMemberEdit() {
            if (this.memberEdit) {
                this.project.members = this.$refs.memberEditComp.copyMembers();
            }
            this.memberEdit = !this.memberEdit;
        },
    },
};
</script>
