<template>
    <div>
        <p v-if="error" class="error--text">{{ error }}</p>
        <v-data-table :headers="headers" :items="edited" no-data-text="no member">
            <template v-slot:item="{ item, index }" disable-sort>
                <tr>
                    <td>
                        <v-tooltip top>
                            <template v-slot:activator="{ on }">
                                <span v-on="on">{{ item.user.fullName }}</span>
                            </template>
                            <span>{{ item.user.email }}</span>
                        </v-tooltip>
                    </td>
                    <td v-for="role of allRoles" :key="role">
                        <v-checkbox
                            dense
                            :input-value="hasRole(item, role)"
                            @click.stop="setRole(item, index, role, $event)"
                        ></v-checkbox>
                    </td>
                    <td>
                        <v-btn small @click="removeMember(item)">
                            <v-icon small>mdi-account-minus</v-icon>
                        </v-btn>
                    </td>
                </tr>
            </template>
        </v-data-table>
        <user-finder title="Add members" :columns="['fullName']">
            <template v-slot:action="{ user }">
                <td>
                    <v-btn v-if="!hasMember(user)" small @click="addMember(user)">
                        <v-icon small>mdi-account-plus</v-icon>
                    </v-btn>
                </td>
            </template>
        </user-finder>
    </div>
</template>
<script>
import gql from 'graphql-tag';
import cloneDeep from 'lodash.clonedeep';
import upperFirst from 'lodash.upperfirst';
import { isApolloError } from 'apollo-client';
import { apolloClient, extractGQLErrors } from '../apollo';
import { PROJECT_MEMBER_FIELDS } from '../graphql';
import UserFinder from './UserFinder';

const UPDATE_MEMBER = gql`
    mutation UpdateMemberRoles($id: ID!, $roles: [String!]) {
        projectMemberUpdateRoles(id: $id, roles: $roles) {
            ...ProjectMemberFields
        }
    }
    ${PROJECT_MEMBER_FIELDS}
`;

const CREATE_MEMBER = gql`
    mutation CreateMember($projectMember: ProjectMemberInput!) {
        projectMemberCreate(projectMember: $projectMember) {
            ...ProjectMemberFields
        }
    }
    ${PROJECT_MEMBER_FIELDS}
`;

const DELETE_MEMBER = gql`
    mutation DeleteMember($id: ID!) {
        projectMemberDelete(id: $id)
    }
`;

export default {
    components: {
        UserFinder,
    },
    props: {
        members: {
            type: Array,
            default: () => [],
        },
        projectId: {
            type: String,
            required: true,
            validator: val => typeof val === 'string' && val.length > 0,
        },
    },
    data() {
        return {
            edited: cloneDeep(this.members),
            error: '',
        };
    },
    computed: {
        allRoles() {
            return ['leader', 'designer'];
        },
        headers() {
            return [
                { text: 'Name', value: 'user.fullName' },
                ...this.allRoles.map(r => ({ text: upperFirst(r), value: r })),
                { text: 'Remove', value: 'delete' },
            ];
        },
    },
    methods: {
        hasRole(member, role) {
            return member.roles.includes(role);
        },
        hasMember(user) {
            return this.edited.some(m => m.user.id === user.id);
        },
        async addMember(user) {
            try {
                const resp = await apolloClient.mutate({
                    mutation: CREATE_MEMBER,
                    variables: {
                        projectMember: {
                            projectId: this.projectId,
                            userId: user.id,
                        },
                    },
                });
                const newMember = resp.data.projectMemberCreate;
                if (newMember) {
                    this.edited.push(newMember);
                    this.error = '';
                } else {
                    this.error = 'Could not add member';
                }
            } catch (err) {
                this.error = err.message;
                if (isApolloError(err)) {
                    console.error(extractGQLErrors(err));
                }
            }
        },
        async setRole(member, index, role) {
            let newMember;
            const roles = member.roles;
            const newRoles = roles.includes(role)
                ? roles.filter(r => r !== role)
                : [...roles, role];
            try {
                // optimistic UI update
                member.roles = newRoles;
                // actual mutation, followed by UI update
                const resp = await apolloClient.mutate({
                    mutation: UPDATE_MEMBER,
                    variables: {
                        id: member.id,
                        roles: newRoles.length ? newRoles : null,
                    },
                });
                newMember = resp.data.projectMemberUpdateRoles;
                this.error = '';
            } catch (err) {
                this.error = err.message;
                if (isApolloError(err)) {
                    const gqlErrs = extractGQLErrors(err);
                    console.error(gqlErrs);
                }
                newMember = cloneDeep(member);
                newMember.roles = roles;
            }
            this.$set(this.edited, index, newMember);
        },
        async removeMember(member) {
            try {
                const resp = await apolloClient.mutate({
                    mutation: DELETE_MEMBER,
                    variables: {
                        id: member.id,
                    },
                });
                if (resp.data.projectMemberDelete) {
                    this.edited = this.edited.filter(m => m.user.id !== member.user.id);
                }
            } catch (err) {
                console.error(err);
            }
        },
        copyMembers() {
            return cloneDeep(this.edited);
        },
    },
};
</script>
