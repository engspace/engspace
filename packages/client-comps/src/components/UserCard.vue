<template>
    <v-card>
        <v-card-title>
            {{ user.fullName }}
            <v-spacer></v-spacer>
            <slot name="action"></slot>
        </v-card-title>
        <v-card-text>
            <v-container>
                <v-row>
                    <v-col :cols="3" tag="span" class="label">User Id</v-col>
                    <v-col :cols="9" tag="span" class="value">{{ user.name }}</v-col>
                </v-row>
                <v-row>
                    <v-col :cols="3" tag="span" class="label">E-Mail</v-col>
                    <v-col :cols="9" tag="span" class="value">{{ user.email }}</v-col>
                </v-row>
                <v-row>
                    <v-col :cols="3" tag="span" class="label">Roles:</v-col>
                    <v-col :cols="9" tag="span" class="value">{{ roleString }}</v-col>
                </v-row>
            </v-container>
        </v-card-text>
    </v-card>
</template>

<script lang="ts">
import { toRefs, computed, defineComponent } from '@vue/composition-api';
import upperFirst from 'lodash.upperfirst';
import { User } from '@engspace/core';

export default defineComponent({
    props: {
        user: {
            type: Object,
            default: () => ({ name: '', email: '', fullName: '', roles: [] }),
        },
    },
    setup(props: { user: User }) {
        const { user } = toRefs(props);
        const roleString = computed(() => user.value.roles?.map((r) => upperFirst(r)).join(', '));
        return {
            roleString,
        };
    },
});
</script>
