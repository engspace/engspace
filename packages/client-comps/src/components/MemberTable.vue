<template>
    <v-data-table :headers="headers" :loading="loading" :items="flatten"></v-data-table>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import { ProjectMember, User } from '@engspace/core';
import { roleString } from '../utils';

const colHeaders: { [key: string]: string } = {
    name: 'User Id',
    fullName: 'Name',
    email: 'E-mail',
    userRoles: 'User roles',
    projRoles: 'Project roles',
};

export default defineComponent({
    props: {
        value: {
            type: Array,
            default: () => [],
        },
        columns: {
            type: Array,
            default: () => ['name', 'fullName', 'email', 'projRoles'],
            validate: (val: string[]) => val.every((v) => v in colHeaders),
        },
        loading: {
            type: Boolean,
            default: false,
        },
    },
    setup(props: { value: ProjectMember[]; columns: string[] }) {
        const headers = computed(() =>
            props.columns.map((c) => ({
                text: colHeaders[c],
                value: c,
            }))
        );
        const flatten = computed(() =>
            props.value.map((pm: ProjectMember) => ({
                name: (pm.user as User).name,
                fullName: (pm.user as User).fullName,
                email: (pm.user as User).email,
                userRoles: roleString((pm.user as User).roles) || '',
                projRoles: roleString(pm.roles) || '',
            }))
        );
        return {
            headers,
            flatten,
        };
    },
});
</script>
