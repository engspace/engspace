<template>
    <v-card>
        <v-card-title>
            {{ title }}
            <span v-if="copy.id && showId">Id: {{ copy.id }}</span>
        </v-card-title>
        <v-card-actions>
            <slot name="action" :user="copy"></slot>
        </v-card-actions>
        <v-card-subtitle>
            <v-alert v-if="!!error" type="error" dense colored-border border="right">
                {{ error }}
            </v-alert>
        </v-card-subtitle>
        <v-card-text>
            <v-text-field v-model="copy.fullName" dense label="Full name"></v-text-field>
            <v-text-field v-model="copy.name" dense label="User Id"></v-text-field>
            <v-text-field v-model="copy.email" dense label="E-Mail"></v-text-field>
            <v-card>
                <v-card-title>Roles:</v-card-title>
                <v-card-text>
                    <v-checkbox
                        v-for="role in allRoles"
                        :key="role"
                        v-model="copy.roles"
                        :value="role"
                        dense
                        :label="upperFirst(role)"
                    ></v-checkbox>
                </v-card-text>
            </v-card>
        </v-card-text>
    </v-card>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from '@vue/composition-api';
import cloneDeep from 'lodash.clonedeep';
import upperFirst from 'lodash.upperfirst';
import { User, UserInput } from '@engspace/core';
import { useConfig } from '../config';

function copyUser(user: User | UserInput): User | UserInput {
    const copy = cloneDeep(user);
    if (!Array.isArray(copy.roles)) {
        copy.roles = [];
    }
    return copy;
}

export default defineComponent({
    props: {
        title: {
            type: String,
            default: 'Edit user',
        },
        showId: {
            type: Boolean,
            default: false,
        },
        user: {
            type: Object,
            default: () => ({}),
        },
        error: {
            type: String,
            default: '',
        },
    },
    setup(props: { title: string; showId: boolean; user: UserInput | User }) {
        const { rolePolicies } = useConfig();
        const allRoles = rolePolicies.user.allRoles();

        const copy = ref(copyUser(props.user));

        watch(
            () => props.user,
            (user: UserInput | User) => {
                copy.value = copyUser(user);
            }
        );

        return {
            copy,

            allRoles,
            upperFirst,
        };
    },
});
</script>

<style lang="scss" scoped></style>
