<template>
    <div>
        <v-alert v-if="!!error" type="error" dense colored-border border="right">
            {{ error && error.message }}
        </v-alert>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
    props: {
        error: {
            type: Error,
            default: null,
        },
    },
});
</script>
