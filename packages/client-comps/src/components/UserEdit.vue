<template>
    <div>
        <v-text-field
            :value="value && value.name"
            :disabled="disabled || !value"
            :readonly="!editableFields.includes('name')"
            :rules="nameRules"
            :error-messages="nameErrorMsg"
            label="User Id"
            @input="updateValue('name', $event)"
        ></v-text-field>
        <v-text-field
            :value="value && value.email"
            :disabled="disabled || !value"
            :readonly="!editableFields.includes('email')"
            :rules="emailRules"
            :error-messages="emailErrorMsg"
            label="E-Mail"
            @input="updateValue('email', $event)"
        ></v-text-field>
        <v-text-field
            :value="value && value.fullName"
            :disabled="disabled || !value"
            :editable="!editableFields.includes('fullName')"
            label="Full name"
            @input="updateValue('fullName', $event)"
        ></v-text-field>
        <div v-if="editableFields.includes('roles')">
            <v-subheader class="v-label">Roles:</v-subheader>
            <v-checkbox
                v-for="role in allRoles"
                :key="role"
                :disabled="disabled || !value"
                :input-value="value && value.roles && value.roles.includes(role)"
                dense
                hide-details
                :label="upperFirst(role)"
                @change="updateList('roles', role, $event)"
            ></v-checkbox>
        </div>
        <es-display-label v-else-if="showRoles" label="Roles">{{ roleString }}</es-display-label>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import upperFirst from 'lodash.upperfirst';
import validator from 'validator';
import { User, UserInput } from '@engspace/core';
import { useConfig } from '../config';
import { useModelUtils } from '../services/form';
import { roleString } from '../utils';

export default defineComponent({
    props: {
        /**
         * User or UserInput value.
         * A null value disables input.
         */
        value: {
            type: Object,
            default: null,
        },
        /**
         * Disables input.
         */
        disabled: {
            type: Boolean,
            default: false,
        },
        /**
         * Enable roles display and edition
         */
        showRoles: {
            type: Boolean,
            default: false,
        },
        /**
         * List of fields that can be edited.
         */
        editableFields: {
            type: Array,
            default: () => ['fullName'],
        },
        /**
         * Whether name conflicts in the database.
         */
        nameConflict: {
            type: Boolean,
            default: false,
        },
        /**
         * Whether email conflicts in the database.
         */
        emailConflict: {
            type: Boolean,
            default: false,
        },
    },
    setup(
        props: {
            value: User | UserInput | null;
            nameConflict: boolean;
            emailConflict: boolean;
        },
        { emit }
    ) {
        const { rolePolicies } = useConfig();
        const allRoles = rolePolicies.user.allRoles();

        const { updateValue, updateList } = useModelUtils(props, emit);

        const roles = computed(() => roleString(props.value?.roles));

        const nameRules = computed(() => [(name: string) => !!name || 'User Id is required']);
        const nameErrorMsg = computed(() => {
            const name = props.value?.name;
            if (name && props.nameConflict) {
                return `${name} already exists in the database`;
            }
            return '';
        });

        const emailRules = computed(() => [
            (email: string) => !!email || 'E-mail is required',
            (email: string) =>
                (!!email && validator.isEmail(email)) || `${email} is not a valid e-mail address`,
        ]);
        const emailErrorMsg = computed(() => {
            const email = props.value?.email;
            if (email && props.emailConflict) {
                return `${email} already exists in the database`;
            }
            return '';
        });

        return {
            allRoles,
            roleString: roles,
            updateValue,
            updateList,
            upperFirst,
            nameRules,
            nameErrorMsg,
            emailRules,
            emailErrorMsg,
        };
    },
});
</script>
