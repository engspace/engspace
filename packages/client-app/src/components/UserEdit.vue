<template>
    <v-card>
        <v-card-title>
            <v-text-field v-model="edited.fullName" dense></v-text-field>
            <v-spacer></v-spacer>
            <v-btn small @click="submit()">
                <v-icon>mdi-content-save</v-icon>
            </v-btn>
        </v-card-title>
        <v-card-subtitle v-if="edited.id">
            <span class="label">Id:</span>
            &nbsp;
            <span>{{ edited.id }}</span>
        </v-card-subtitle>
        <v-card-text>
            <v-text-field v-model="edited.name" label="Login"></v-text-field>
            <v-text-field v-model="edited.email" label="E-Mail"></v-text-field>
            <p>Roles:</p>
            <div class="offset-left">
                <v-checkbox
                    v-model="edited.roles"
                    label="User"
                    value="user"
                    dense
                    hide-details
                ></v-checkbox>
                <v-checkbox
                    v-model="edited.roles"
                    label="Manager"
                    value="manager"
                    dense
                    hide-details
                ></v-checkbox>
                <v-checkbox
                    v-model="edited.roles"
                    label="Admin"
                    value="admin"
                    dense
                    hide-details
                ></v-checkbox>
            </div>
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
    data() {
        return {
            edited: new CUser(this.user),
        };
    },
    methods: {
        submit() {
            this.$emit('save', new CUser(this.edited));
        },
    },
};
</script>

<style scoped>
.label {
    text-decoration: underline;
}
.value {
}
.offset-left {
    padding-left: 2em;
}
</style>
