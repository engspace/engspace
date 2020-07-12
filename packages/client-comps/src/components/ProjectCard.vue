<template>
    <transition name="comp-fade" mode="out-in">
        <v-card v-if="!editing" :loading="loading">
            <v-card-title>
                {{ value.name }}
                <v-spacer></v-spacer>
                <v-btn
                    v-if="editable && !!value.id"
                    icon
                    fab
                    small
                    color="secondary"
                    @click="startEditing"
                >
                    <v-icon>mdi-pencil</v-icon>
                </v-btn>
            </v-card-title>
            <v-card-subtitle>{{ value.code }}</v-card-subtitle>
            <v-card-text>{{ value.description }}</v-card-text>
        </v-card>
        <v-card v-else: loading="updateLoading">
            <v-card-title>
                <v-text-field v-model="editedProj.name" label="Project name"></v-text-field>
            </v-card-title>
            <v-card-subtitle>
                <v-text-field v-model="editedProj.code" label="Project code"></v-text-field>
            </v-card-subtitle>
            <v-card-text>
                <v-textarea v-model="editedProj.description" label="Description"></v-textarea>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="cancelEdition"><v-icon>mdi-close</v-icon> Cancel </v-btn>
                <es-success-btn :anim-state="animState" @click="doneEditing">
                    <v-icon>mdi-check</v-icon> Save
                </es-success-btn>
            </v-card-actions>
            <v-card-subtitle>
                <v-alert v-if="!!error" type="error" dense colored-border border="right">
                    {{ error }}
                </v-alert>
            </v-card-subtitle>
        </v-card>
    </transition>
</template>

<script lang="ts">
import { computed, defineComponent, ref, Ref } from '@vue/composition-api';
import { Project, ProjectInput } from '@engspace/core';
import { useProjectUpdate } from './project';
import { useSuccessAnimate } from './success-btn';

export default defineComponent({
    props: {
        value: {
            type: Object,
            default: () => ({}),
        },
        loading: {
            type: Boolean,
            default: false,
        },
        editable: {
            type: Boolean,
            default: false,
        },
    },
    setup(props: { value: Project }) {
        const editing = ref(false);
        const editedProj: Ref<ProjectInput | null> = ref(null);
        const { animState, animate } = useSuccessAnimate();
        const { mutate, loading: updateLoading, error, onDone } = useProjectUpdate();

        function startEditing() {
            editedProj.value = {
                name: props.value?.name || '',
                code: props.value?.code || '',
                description: props.value?.description || '',
            };
            editing.value = true;
        }
        function doneEditing() {
            mutate({ id: props.value.id, input: editedProj.value });
        }
        function cancelEdition() {
            editedProj.value = null;
            editing.value = false;
        }
        onDone(async () => {
            await animate({ success: true });
            editing.value = false;
        });
        return {
            editing,
            editedProj,
            startEditing,
            doneEditing,
            cancelEdition,
            animState,
            updateLoading,
            error: computed(() => error.value?.message),
        };
    },
});
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
