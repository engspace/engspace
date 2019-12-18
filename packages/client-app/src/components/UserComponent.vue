<template>
    <v-card>
        <v-card-title>
            {{ user.fullName }}
        </v-card-title>
        <v-card-subtitle>
            {{ roleString }}
        </v-card-subtitle>
        <v-card-text>
            <v-text-field v-model="user.name" label="Login"></v-text-field>
            <v-text-field v-model="user.email" label="E-Mail"></v-text-field>
        </v-card-text>
    </v-card>
</template>

<script>
import { CUser } from '@engspace/core';
export default {
    props: {
        user: {
            type: Object,
            default: () => new CUser(),
        },
    },
    computed: {
        roleString() {
            return this.user.roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ');
        },
    },
};
</script>
