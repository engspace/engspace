<template>
    <v-card>
        <v-card-title>
            <v-text-field v-model="edited.fullName"></v-text-field>
            <v-spacer></v-spacer>
            <v-btn small @click="submit()">
                <v-icon>mdi-content-save</v-icon>
            </v-btn>
        </v-card-title>
        <v-card-subtitle v-if="edited.id">
            <span class="label">Database Id:</span>
            &nbsp;
            <span>{{ edited.id }}</span>
        </v-card-subtitle>
        <v-card-text>
            <v-container>
                <v-row>
                    <v-col>
                        <v-text-field v-model="edited.name" label="Login"></v-text-field>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col>
                        <v-text-field v-model="edited.email" label="E-Mail"></v-text-field>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col tag="span" class="label">Roles:</v-col>
                    <v-col>
                        <v-checkbox
                            v-model="edited.roles"
                            label="User"
                            value="user"
                            style="display"
                        ></v-checkbox>
                    </v-col>
                    <v-col>
                        <v-checkbox
                            v-model="edited.roles"
                            label="Manager"
                            value="manager"
                        ></v-checkbox>
                    </v-col>
                    <v-col>
                        <v-checkbox v-model="edited.roles" label="Admin" value="admin"></v-checkbox>
                    </v-col>
                </v-row>
            </v-container>
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
</style>
