<template>
    <v-data-table :headers="headers" :items="value">
        <template v-slot:item="{ item, index }">
            <tr>
                <td>
                    <v-tooltip top>
                        <template v-slot:activator="{ on }">
                            <span v-on="on">{{ item.user.fullName }}</span>
                        </template>
                        <span>{{ item.user.email }}</span>
                    </v-tooltip>
                </td>
                <td v-for="role of allRoles" :key="role">
                    <v-checkbox
                        dense
                        :input-value="item.roles && item.roles.includes(role)"
                        @click.stop="$emit('role-toggle', { member: item, index, role })"
                    ></v-checkbox>
                </td>
                <td>
                    <v-btn small icon @click="$emit('member-remove', { member: item, index })">
                        <v-icon small>mdi-account-minus</v-icon>
                    </v-btn>
                </td>
            </tr>
        </template>
    </v-data-table>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import upperFirst from 'lodash.upperfirst';
// import { ProjectMember } from '@engspace/core';
import { useConfig } from '../config';

export default defineComponent({
    props: {
        value: {
            type: Array,
            default: () => [],
        },
    },
    setup() {
        const { rolePolicies } = useConfig();
        const allRoles = rolePolicies.project.allRoles();
        const headers = [
            {
                text: 'User',
                value: 'user',
                sortable: false,
            },
            ...allRoles.map((r) => ({
                text: upperFirst(r),
                value: r,
                sortable: false,
            })),
            {
                text: '',
                value: 'remove',
                sortable: false,
            },
        ];

        return {
            headers,
            allRoles,
        };
    },
});
</script>
