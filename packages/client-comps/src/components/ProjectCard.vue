<template>
    <transition mode="out-in">
        <v-card v-if="!editing" :loading="loading">
            <v-card-title>
                {{ value.name }}
                <v-spacer></v-spacer>
                <v-btn
                    v-if="editable && !!value.id"
                    icon
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
        <v-card v-else :loading="updateLoading">
            <v-card-title>
                <v-text-field
                    :value="editedProj.name"
                    label="Project name"
                    @input="updateValue('name', $event)"
                ></v-text-field>
            </v-card-title>
            <v-card-subtitle>
                <v-text-field
                    :value="editedProj.code"
                    label="Project code"
                    @input="updateValue('code', $event)"
                ></v-text-field>
            </v-card-subtitle>
            <v-card-text>
                <v-textarea
                    :value="editedProj.description"
                    label="Description"
                    @input="updateValue('description', $event)"
                ></v-textarea>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="cancelEdition"><v-icon>mdi-close</v-icon> Cancel </v-btn>
                <es-success-btn
                    :anim-state="animState"
                    class="mr-3"
                    :disabled="!updateEnabled"
                    @click="doneEditing"
                >
                    <v-icon>mdi-check</v-icon> Save
                </es-success-btn>
            </v-card-actions>
            <v-card-subtitle>
                <es-error-alert :error="computedError"></es-error-alert>
            </v-card-subtitle>
        </v-card>
    </transition>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import isEqual from 'lodash.isequal';
import { Project, ProjectInput } from '@engspace/core';
import { useProjectUpdate } from './project';
import { useSuccessAnimate } from './success-btn';

function defaultProj(): ProjectInput {
    return {
        code: '',
        name: '',
        description: '',
    };
}

function projInput(proj: Project): ProjectInput {
    return {
        code: proj.code,
        name: proj.name,
        description: proj.description,
    };
}

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
        error: {
            type: Error,
            default: null,
        },
    },
    setup(props: { value: Project; error: Error }) {
        const editing = ref(false);
        const editedProj = ref(defaultProj());
        const input = computed(() => projInput(props.value));
        const { animState, animate } = useSuccessAnimate();
        const { mutate, loading: updateLoading, error, onDone } = useProjectUpdate();

        const updateEnabled = computed(() => {
            return !isEqual(editedProj.value, input.value);
        });

        function updateValue(key: string, value: string) {
            editedProj.value = { ...editedProj.value, [key]: value };
        }

        function startEditing() {
            editedProj.value = input.value;
            editing.value = true;
        }
        function doneEditing() {
            mutate({ id: props.value.id, input: editedProj.value });
        }
        function cancelEdition() {
            editedProj.value = defaultProj();
            editing.value = false;
        }
        onDone(async () => {
            await animate({ success: true });
            editing.value = false;
        });
        return {
            editing,
            editedProj,
            updateValue,
            updateEnabled,
            startEditing,
            doneEditing,
            cancelEdition,
            animState,
            updateLoading,
            computedError: computed(() => props.error || error.value),
        };
    },
});
</script>
