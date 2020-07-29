<template>
    <div>
        <v-text-field
            label="Project Code"
            :value="value.code"
            class="required"
            :rules="rules"
            @input="updateValue('code', $event)"
        ></v-text-field>
        <v-text-field
            label="Project Name"
            :value="value.name"
            class="required"
            :rules="rules"
            @input="updateValue('name', $event)"
        ></v-text-field>
        <v-text-field
            label="Description"
            :value="value.description"
            class="required"
            @input="updateValue('description', $event)"
        ></v-text-field>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { useModelUtils, rules } from '../services/form';

export default defineComponent({
    props: {
        value: {
            type: Object,
            default: () => ({}),
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, { emit }) {
        const { updateValue } = useModelUtils(props, emit);
        return {
            updateValue,
            rules: [rules.required],
        };
    },
});
</script>
