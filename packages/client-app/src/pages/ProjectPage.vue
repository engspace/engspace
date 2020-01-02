<template>
    <v-container fluid>
        <v-row>
            <v-col :cols="12" :md="5">
                <transition name="comp-fade" mode="out-in">
                    <project-read
                        v-if="!projectEdit"
                        :can-edit="canEditProject"
                        :project="project"
                        @edit="projectEdit = true"
                    ></project-read>
                    <project-edit
                        v-if="projectEdit"
                        ref="projectEditComp"
                        :project="project"
                        :error="projectError"
                        @save="saveProject($event)"
                        @cancel="projectEdit = false"
                    ></project-edit>
                </transition>
            </v-col>
            <v-col :cols="12" :md="7">
                <v-card>
                    <v-card-title>
                        Team members
                        <v-spacer></v-spacer>
                        <v-btn v-if="canEditMembers" small @click="toggleMemberEdit()">
                            <v-icon>{{ memberEdit ? 'mdi-check' : 'mdi-pencil' }}</v-icon>
                            &nbsp;
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
import ProjectEdit from '../components/ProjectEdit';
import { apolloClient, extractGQLError, extractGQLErrors } from '../apollo';
import { PROJECT_MEMBER_FIELDS, PROJECT_FIELDS, MEMBER_FIELDS } from '../graphql';
import { rolePolicies } from '../permissions';

const GET_USER_MEMBER = gql`
    query GetUserMember($projectId: ID!, $userId: ID!) {
        projectMemberByProjectAndUserId(projectId: $projectId, userId: $userId) {
            ...MemberFields
        }
    }
    ${MEMBER_FIELDS}
`;

const GET_PROJECT = gql`
    query GetProject($id: ID!) {
        project(id: $id) {
            ...ProjectFields
            members {
                ...ProjectMemberFields
            }
        }
    }
    ${PROJECT_FIELDS}
    ${PROJECT_MEMBER_FIELDS}
`;

const GET_PROJECT_BY_CODE = gql`
    query GetProjectByCode($code: String!) {
        projectByCode(code: $code) {
            ...ProjectFields
            members {
                ...ProjectMemberFields
            }
        }
    }
    ${PROJECT_FIELDS}
    ${PROJECT_MEMBER_FIELDS}
`;

const UPDATE_PROJECT = gql`
    mutation UpdateProject($id: ID!, $project: ProjectInput!) {
        updateProject(id: $id, project: $project) {
            ...ProjectFields
        }
    }
    ${PROJECT_FIELDS}
`;

export default {
    components: {
        ProjectMemberRead,
        ProjectMemberEdit,
        ProjectEdit,
        ProjectRead,
    },
    data() {
        return {
            project: new CProject(),
            projectEdit: false,
            projectError: '',
            memberEdit: false,
            userMember: null,
        };
    },
    computed: {
        memberPermissions() {
            return this.userMember ? rolePolicies.project.permissions(this.userMember.roles) : [];
        },
        canEditProject() {
            return this.hasPerm('project.update');
        },
        canEditMembers() {
            return this.hasPerm('member.update');
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
            const projectId = this.project.id;
            const { userId } = this.$store.getters.auth;
            const resp = await apolloClient.query({
                query: GET_USER_MEMBER,
                variables: {
                    projectId,
                    userId,
                },
            });
            this.userMember = resp.data.projectMemberByProjectAndUserId;
        } catch (err) {
            console.error(err);
            if (isApolloError(err)) {
                console.error(extractGQLError(err));
            }
        }
    },
    methods: {
        hasPerm(perm) {
            return (
                this.$store.getters.userPermissions.includes(perm) ||
                this.memberPermissions.includes(perm)
            );
        },
        async saveProject(project) {
            try {
                const oldCode = this.project.code;
                const { id, code, name, description } = project;
                const resp = await apolloClient.mutate({
                    mutation: UPDATE_PROJECT,
                    variables: {
                        id,
                        project: { code, name, description },
                    },
                });
                const newProj = resp.data.updateProject;
                newProj.members = this.project.members;
                this.project = newProj;
                this.projectError = '';
                await this.$refs.projectEditComp.animateSuccess();
                this.projectEdit = false;
                if (oldCode !== this.project.code && this.$route.path.includes('/by-code/')) {
                    // update address bar
                }
            } catch (err) {
                this.projectError = err.message;
                if (isApolloError(err)) {
                    console.error(extractGQLErrors(err));
                }
            }
        },
        toggleMemberEdit() {
            if (this.memberEdit) {
                this.project.members = this.$refs.memberEditComp.copyMembers();
            }
            this.memberEdit = !this.memberEdit;
        },
    },
};
</script>

<style scoped>
.comp-fade-enter-active,
.comp-fade-leave-active {
    transition: opacity 0.15s ease;
}
.comp-fade-enter,
.comp-fade-leave-to {
    opacity: 0;
}
</style>
