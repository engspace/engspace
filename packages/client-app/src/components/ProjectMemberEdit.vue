<template>
    <div>
        <span v-if="error" class="red--text">{{ error }}</span>
        <v-data-table :headers="headers" :items="edited">
            <template v-slot:item="{ item, index }">
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
                            <v-icon>mdi-delete</v-icon>
                        </v-btn>
                    </td>
                </tr>
            </template>
        </v-data-table>
    </div>
</template>
<script>
import gql from 'graphql-tag';
import cloneDeep from 'lodash.clonedeep';
import upperFirst from 'lodash.upperfirst';
import { isApolloError } from 'apollo-client';
import { apolloClient, extractGQLErrors } from '../apollo';
import { MEMBER_FIELDS } from '../graphql';

const UPDATE_MEMBER = gql`
    mutation UpdateMemberRoles($id: ID!, $roles: [String!]) {
        updateProjectMemberRoles(id: $id, roles: $roles) {
            ...MemberFields
        }
    }
    ${MEMBER_FIELDS}
`;

const DELETE_MEMBER = gql`
    mutation DeleteMember($id: ID!) {
        deleteProjectMember(id: $id)
    }
`;

export default {
    props: {
        members: {
            type: Array,
            default: () => [],
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
            // TODO: organization-specific list
            return ['leader', 'designer'];
        },
        headers() {
            return [
                { text: 'Name', value: 'user.fullName', sortable: false },
                ...this.allRoles.map(r => ({ text: upperFirst(r), value: r, sortable: false })),
                { text: 'Remove', value: 'delete', sortable: false },
            ];
        },
    },
    methods: {
        hasRole(member, role) {
            return member.roles.includes(role);
        },
        async setRole(member, index, role) {
            let newMember;
            const roles = member.roles.includes(role)
                ? member.roles.filter(r => r !== role)
                : [...member.roles, role];
            try {
                const resp = await apolloClient.mutate({
                    mutation: UPDATE_MEMBER,
                    variables: {
                        id: member.id,
                        roles: roles.length ? roles : null,
                    },
                });
                newMember = resp.data.updateProjectMemberRoles;
                this.error = '';
            } catch (err) {
                this.error = err.message;
                if (isApolloError(err)) {
                    const gqlErrs = extractGQLErrors(err);
                    console.error(gqlErrs);
                }
                newMember = cloneDeep(member);
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
                if (resp.data.deleteProjectMember) {
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
