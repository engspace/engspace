<template>
    <v-card>
        <v-card-title>
            <v-text-field v-model="edited.name"></v-text-field>
        </v-card-title>
        <v-card-subtitle>
            <span class="label">Id:</span>&nbsp;{{ edited.id }}
            <br v-if="error" />
            <span v-if="error" class="red--text">{{ error }}</span>
        </v-card-subtitle>
        <v-card-text>
            <v-container>
                <v-row>
                    <v-col tag="span" class="label" :cols="4">code:</v-col>
                    <v-col tag="span" class="value" :cols="8">
                        <v-text-field v-model="edited.code" hide-details></v-text-field>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col tag="span" class="label" :cols="4">description:</v-col>
                    <v-col tag="span" class="value" :cols="8">
                        <v-textarea v-model="edited.description" hide-details></v-textarea>
                    </v-col>
                </v-row>
            </v-container>
        </v-card-text>
        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn small style="margin-right:1em" @click="$emit('cancel')">
                <v-icon>mdi-cross</v-icon>
                &nbsp; Cancel
            </v-btn>
            <success-btn ref="successBtn" small @click="$emit('save', edited)">
                <v-icon>mdi-content-save</v-icon>&nbsp;Save
            </success-btn>
        </v-card-actions>
    </v-card>
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
