<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12" sm="6" md="4">
                <es-project-card
                    :loading="loading"
                    :value="project"
                    :editable="editable"
                ></es-project-card>
            </v-col>
            <v-col cols="12" sm="6" md="8">
                <v-card>
                    <v-card-title>Members</v-card-title>
                    <v-card-text>
                        <es-member-table
                            :loading="loading"
                            :value="project && project.members"
                        ></es-member-table>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-alert v-if="!!error" type="error" dense colored-border border="right">
                    {{ error.message }}
                </v-alert>
            </v-col>
        </v-row>
    </v-container>
</template>

<script lang="ts">
import { useQuery, useResult } from '@vue/apollo-composable';
import { computed, defineComponent } from '@vue/composition-api';
import gql from 'graphql-tag';
import { PROJECT_FIELDS, USER_FIELDS } from '@engspace/client-comps';
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

        return {
            project,
            editable,
            loading,
            error,
        };
    },
});
</script>
