<template>
    <v-badge
        :color="badgeColor"
        :left="badgeLeft"
        :bottom="badgeBottom"
        :value="animState.value"
        overlap
    >
        <template v-slot:badge>
            <v-icon dark small>{{ badgeIcon }}</v-icon>
        </template>
        <v-btn :small="small" :type="type" @click="$emit('click')">
            <slot></slot>
        </v-btn>
    </v-badge>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import { AnimState } from './success-btn';

export default defineComponent({
    props: {
        badgeBottom: {
            type: Boolean,
            default: false,
        },
        badgeLeft: {
            type: Boolean,
            default: false,
        },
        small: {
            type: Boolean,
            default: false,
        },
        type: {
            type: String,
            default: 'button',
        },
        animState: {
            type: Object,
            default: { value: false, success: true },
        },
    },
    setup(props: { animState: AnimState }) {
        const badgeColor = computed(() => (props.animState.success ? 'teal' : 'red'));
        const badgeIcon = computed(() => (props.animState.success ? 'mdi-check' : 'mdi-close'));

        return {
            badgeColor,
            badgeIcon,
        };
    },
});
</script>
