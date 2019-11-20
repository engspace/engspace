<template>
    <v-form @submit.prevent="saveProject">
        <v-card>
            <v-card-title>Edit Project</v-card-title>
            <v-card-text>
                <project-edit :project="project" />
            </v-card-text>
            <v-card-actions>
                <v-btn type="submit">
                    Submit
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-form>
</template>

<script lang="ts">
import Vue from 'vue';
import HttpStatus from 'http-status-codes';
import { Project } from '@engspace/core';
import { Api } from '../api';
import ProjectEdit from '../components/ProjectEdit.vue';

export default Vue.extend({
    components: {
        ProjectEdit,
    },
    data() {
        return {
            project: new Project(),
        };
    },
    async created() {
        const { code } = this.$route.params;
        const res = await Api.get(`/projects/by-code/${code}`);
        this.project = new Project(res.data);
    },
    methods: {
        async saveProject() {
            const { id } = this.project;
            if (!id) {
                // error?
            }
            const res = await Api.put(`/projects/${id}`, this.project);
            if (res.status !== HttpStatus.OK) {
                // error?
            }
            this.$router.push(`/project/by-code/${this.project.code}`);
        },
    },
});
</script>
