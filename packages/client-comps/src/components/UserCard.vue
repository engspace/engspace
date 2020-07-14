<template>
    <v-card>
        <v-card-title>
            {{ value.fullName }}
            <v-spacer></v-spacer>
            <slot name="action"></slot>
        </v-card-title>
        <v-card-text>
            <v-container>
                <v-row>
                    <v-col :cols="3" tag="span" class="label">User Id</v-col>
                    <v-col :cols="9" tag="span" class="value">{{ value.name }}</v-col>
                </v-row>
                <v-row>
                    <v-col :cols="3" tag="span" class="label">E-Mail</v-col>
                    <v-col :cols="9" tag="span" class="value">{{ value.email }}</v-col>
                </v-row>
                <v-row v-if="showRoles">
                    <v-col :cols="3" tag="span" class="label">Roles:</v-col>
                    <v-col :cols="9" tag="span" class="value">{{ roleString }}</v-col>
                </v-row>
            </v-container>
        </v-card-text>
    </v-card>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import { User } from '@engspace/core';
import { roleString } from '../utils';

export default defineComponent({
    props: {
        value: {
            type: Object,
            default: () => null,
        },
        showRoles: {
            type: Boolean,
            default: false,
        },
    },
    setup(props: { value: User | undefined }) {
        return {
            roles: computed(() => roleString(props.value?.roles)),
        };
    },
});
</script>
