<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12" md="6" lg="3">
                <es-project-card
                    :loading="loading"
                    :value="project"
                    :editable="editable"
                    :error="error"
                ></es-project-card>
            </v-col>
            <v-col cols="12" md="6" lg="4">
                <v-card>
                    <v-card-title>
                        Members
                        <v-spacer></v-spacer>
                        <v-btn
                            v-if="editable && !memberEdit"
                            icon
                            small
                            color="secondary"
                            @click="memberEdit = true"
                        >
                            <v-icon>mdi-pencil</v-icon>
                        </v-btn>
                        <v-btn
                            v-else-if="editable"
                            small
                            color="secondary"
                            @click="memberEdit = false"
                        >
                            <v-icon>mdi-check</v-icon> Done
                        </v-btn>
                    </v-card-title>
                    <v-card-text>
                        <transition>
                            <div v-if="memberEdit" key="1">
                                <es-member-edit-table
                                    :value="project && project.members"
                                    @role-toggle="toggleRole"
                                    @member-remove="removeMember"
                                >
                                </es-member-edit-table>
                                <es-user-finder
                                    title="Find new members"
                                    :columns="['fullName', 'email']"
                                >
                                    <template #action="{user}">
                                        <td>
                                            <v-btn
                                                v-if="!hasMember(user)"
                                                small
                                                icon
                                                @click="addMember(user)"
                                            >
                                                <v-icon small>mdi-account-plus</v-icon>
                                            </v-btn>
                                        </td>
                                    </template>
                                </es-user-finder>
                            </div>
                            <es-member-table
                                v-else
                                key="2"
                                :loading="memberLoading"
                                :value="project && project.members"
                            ></es-member-table>
                        </transition>
                        <es-error-alert :error="memberError"></es-error-alert>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script lang="ts">
import { useQuery, useResult, useMutation } from '@vue/apollo-composable';
import { computed, defineComponent, ref } from '@vue/composition-api';
import gql from 'graphql-tag';
import {
    PROJECT_FIELDS,
    PROJECT_MEMBER_UPDATE,
    PROJECT_MEMBER_ADD,
    PROJECT_MEMBER_REMOVE,
    USER_FIELDS,
} from '@engspace/client-comps';
import { ProjectMember, User } from '@engspace/core';
import { useAuth } from '../auth';

const FIELDS = gql`
    fragment ProjectPageFields on Project {
        ...ProjectFields
        members {
            id
            user {
                ...UserFields
            }
            roles
        }
    }
    ${USER_FIELDS}
    ${PROJECT_FIELDS}
`;

const PROJECT_GET = gql`
    query GetProject($id: ID!) {
        project(id: $id) {
            ...ProjectPageFields
        }
    }
    ${FIELDS}
`;

const PROJECT_GET_BY_CODE = gql`
    query GetProjectByCode($code: String!) {
        project(id: $id) {
            ...ProjectPageFields
        }
    }
    ${FIELDS}
`;

export default defineComponent({
    setup(props, { root }) {
        const { userPerms } = useAuth();
        const { $route } = root;
        const { path, params } = $route;
        let q;
        if (path.includes('/by-code')) {
            const { code } = params;
            q = useQuery(PROJECT_GET_BY_CODE, { code });
        } else {
            const { id } = params;
            q = useQuery(PROJECT_GET, { id });
        }
        const { result, loading, error } = q;
        const project = useResult(result);
        const editable = computed(() => userPerms.value?.includes('project.update'));

        const memberEdit = ref(false);

        function hasMember(user: User) {
            return !!project.value?.members.find((m: ProjectMember) => m.user.id === user.id);
        }

        const { mutate: setRoleMutate, error: setRoleError, loading: setRoleLoading } = useMutation(
            PROJECT_MEMBER_UPDATE
        );
        const { mutate: removeMutate, error: removeError, loading: removeLoading } = useMutation(
            PROJECT_MEMBER_REMOVE
        );
        const { mutate: addMutate, error: addError, loading: addLoading } = useMutation(
            PROJECT_MEMBER_ADD
        );

        function toggleRole({
            member,
            role,
        }: {
            member: ProjectMember;
            role: string;
            value: boolean;
        }) {
            let roles: string[] | null = member.roles || [];
            if (roles.includes(role)) {
                roles = roles.filter((r) => r !== role);
            } else {
                roles = [...roles, role];
            }
            if (!roles.length) {
                roles = null;
            }
            setRoleMutate({ memberId: member.id, roles });
        }

        function removeMember({ member }: { member: ProjectMember }) {
            removeMutate({ memberId: member.id }, { refetchQueries: ['GetProject'] });
        }

        function addMember(user: User) {
            const proj = project.value;
            if (!proj) return;
            addMutate(
                {
                    input: {
                        userId: user.id,
                        projectId: proj.id,
                        roles: [],
                    },
                },
                {
                    refetchQueries: ['GetProject'],
                }
            );
        }

        const memberLoading = computed(
            () => setRoleLoading.value || removeLoading.value || addLoading.value
        );
        const memberError = computed(
            () => setRoleError.value || removeError.value || addError.value
        );

        return {
            project,
            loading,
            error,

            editable,
            memberEdit,

            hasMember,

            toggleRole,
            removeMember,
            addMember,

            memberLoading,
            memberError,
        };
    },
});
</script>
