<template>
    <div>
        <v-text-field
            :value="value && value.fullName"
            dense
            small
            label="Full name"
            @input="updateValue('fullName', $event)"
        ></v-text-field>
        <v-text-field
            :value="value && value.name"
            dense
            small
            label="User Id"
            @input="updateValue('name', $event)"
        ></v-text-field>
        <v-text-field
            :value="value && value.email"
            dense
            small
            label="E-Mail"
            @input="updateValue('email', $event)"
        ></v-text-field>
        <v-subheader class="v-label">Roles:</v-subheader>
        <v-checkbox
            v-for="role in allRoles"
            :key="role"
            :value="value && value.roles && value.roles.includes(role)"
            dense
            hide-details
            :label="upperFirst(role)"
            @input="updateRole(role, $event)"
        ></v-checkbox>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import upperFirst from 'lodash.upperfirst';
import { User, UserInput } from '@engspace/core';
import { useConfig } from '../config';

export default defineComponent({
    props: {
        value: {
            type: Object,
            default: null,
        },
    },
    setup(props: { value: User | UserInput | null }, { emit }) {
        const { rolePolicies } = useConfig();
        const allRoles = rolePolicies.user.allRoles();

        function updateValue(key: string, value: string) {
            emit('input', { ...props.value, [key]: value });
        }

        function updateRole(role: string, value: boolean) {
            let roles = props.value?.roles || [];
            if (value && !roles.includes(role)) {
                roles = [...roles, role];
            } else if (!value) {
                roles = roles.filter((r) => r !== role);
            }
            emit('input', { ...props.value, roles });
        }

        return {
            allRoles,
            updateValue,
            updateRole,
            upperFirst,
        };
    },
});
</script>
