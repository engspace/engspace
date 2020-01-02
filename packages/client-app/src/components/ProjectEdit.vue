<template>
    <v-form @submit.prevent="$emit('save', edited)">
        <v-card>
            <v-card-text>
                <p v-if="error" class="my-4">
                    <span class="red--text">{{ error }}</span>
                </p>
                <v-text-field
                    v-model="edited.name"
                    label="Project name"
                    hide-details
                ></v-text-field>
                <p v-if="edited.id" class="my-4">
                    <span class="label">Id:</span>&nbsp;{{ edited.id }}
                </p>
                <v-text-field
                    v-model="edited.code"
                    label="Project code"
                    hide-details
                ></v-text-field>
                <v-textarea
                    v-model="edited.description"
                    label="Description"
                    hide-details
                ></v-textarea>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn small class="mr-8" @click="$emit('cancel')">
                    <v-icon>mdi-cross</v-icon>
                    &nbsp; Cancel
                </v-btn>
                <success-btn ref="successBtn" small badge-left type="submit">
                    <v-icon>mdi-content-save</v-icon>&nbsp;Save
                </success-btn>
            </v-card-actions>
        </v-card>
    </v-form>
</template>

<script>
import { CProject } from '@engspace/core';
import SuccessBtn from './SuccessBtn';

export default {
    components: {
        SuccessBtn,
    },
    props: {
        project: {
            type: Object,
            default: () => new CProject(),
        },
        error: {
            type: String,
            default: '',
        },
    },
    data() {
        return {
            edited: new CProject(this.project),
        };
    },
    methods: {
        async animateSuccess() {
            return this.$refs.successBtn.animate();
        },
    },
};
</script>
