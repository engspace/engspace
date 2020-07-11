<template>
    <v-card :loading="loading">
        <v-card-title>{{ value.name }}</v-card-title>
        <v-card-subtitle>{{ value.code }}</v-card-subtitle>
        <v-card-text>{{ value.description }}</v-card-text>
    </v-card>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
    props: {
        value: {
            type: Object,
            required: true,
        },
        loading: {
            type: Boolean,
            default: false,
        },
    },
});
</script>
