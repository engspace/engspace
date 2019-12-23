<template>
    <v-badge color="teal" :left="badgeLeft" :bottom="badgeBottom" :value="show">
        <template v-slot:badge>
            <v-icon dark>mdi-check</v-icon>
        </template>
        <v-btn @click="$emit('click')">
            <slot></slot>
        </v-btn>
    </v-badge>
</template>

<script>
import { waitMs } from '../utils';
export default {
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
        value: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            show: this.value,
        };
    },
    watch: {
        value(val) {
            this.show = val;
        },
    },
    methods: {
        async animate(ms = 1000) {
            this.show = true;
            await waitMs(ms);
            this.show = false;
        },
    },
};
</script>
