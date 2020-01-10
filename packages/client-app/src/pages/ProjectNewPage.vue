<template>
    <project-edit
        ref="projectEditComp"
        :project="project"
        :error="error"
        @save="saveProject($event)"
        @cancel="cancel()"
    ></project-edit>
</template>
<script>
import { CProject } from '@engspace/core';
import { isApolloError } from 'apollo-client';
import gql from 'graphql-tag';
import { apolloClient, extractGQLErrors } from '../apollo';
import ProjectEdit from '../components/ProjectEdit';
import { PROJECT_FIELDS } from '../graphql';

const CREATE_PROJECT = gql`
    mutation CreateProject($project: ProjectInput!) {
        projectCreate(project: $project) {
            ...ProjectFields
        }
    }
    ${PROJECT_FIELDS}
`;

export default {
    components: {
        ProjectEdit,
    },
    data() {
        return {
            project: new CProject(),
            error: '',
        };
    },
    methods: {
        async saveProject(project) {
            const { code, name, description } = project;
            try {
                const resp = await apolloClient.mutate({
                    mutation: CREATE_PROJECT,
                    variables: {
                        project: {
                            code,
                            name,
                            description,
                        },
                    },
                });
                await this.$refs.projectEditComp.animateSuccess();
                this.error = '';
                const { id } = resp.data.projectCreate;
                this.$router.push(`/project/${id}`);
            } catch (err) {
                this.error = err.message;
                if (isApolloError(err)) {
                    console.error(extractGQLErrors(err));
                }
            }
        },
        cancel() {
            this.$router.push('/');
        },
    },
};
</script>
