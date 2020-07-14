<template>
    <div>
        <span v-if="!!label">
            <span class="v-label">{{ label }}</span> :
        </span>
        <slot></slot>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
    props: {
        label: {
            type: String,
            default: null,
        },
    },
});
</script>
