<template>
    <v-data-table :headers="headers" :items="members" no-data-text="no member">
        <template v-slot:item="{ item }">
            <tr>
                <td>
                    <v-tooltip top>
                        <template v-slot:activator="{ on }">
                            <span v-on="on">{{ item.user.fullName }}</span>
                        </template>
                        <span>{{ item.user.email }}</span>
                    </v-tooltip>
                </td>
                <td>{{ roleString(item.roles) }}</td>
            </tr>
        </template>
    </v-data-table>
</template>

<script>
import upperFirst from 'lodash.upperfirst';

export default {
    props: {
        members: {
            type: Array,
            default: () => [],
        },
        canEdit: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            headers: [{ text: 'Name' }, { text: 'Role' }],
        };
    },
    methods: {
        roleString(roles) {
            return roles.map(r => upperFirst(r)).join(', ');
        },
    },
};
</script>
