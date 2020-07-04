<template>
    <v-card>
        <v-card-title>
            {{ title }}
            <v-spacer></v-spacer>
            <v-text-field
                v-model="search"
                class="text-body-1"
                :label="searchLabel"
                append-icon="mdi-magnify"
                single-line
                hide-details
            ></v-text-field>
        </v-card-title>
        <v-data-table
            :headers="headers"
            :loading="loading"
            :items="users"
            :server-items-length="count"
            :page.sync="page"
            :items-per-page.sync="itemsPerPage"
            disable-sort
        >
            <template v-slot:item="{ item }">
                <tr
                    :class="{ primary: selectable && value && value.id === item.id }"
                    @click="selectUser(item)"
                >
                    <td v-for="col in columns" :key="col">{{ item[col] }}</td>
                </tr>
            </template>
        </v-data-table>
        <v-card-subtitle>
            <v-alert v-if="!!error" type="error" dense colored-border border="right">
                {{ error.message }}
            </v-alert>
        </v-card-subtitle>
    </v-card>
</template>

<script lang="ts">
import { defineComponent, toRefs, computed, ref, watch } from '@vue/composition-api';
import cloneDeep from 'lodash.clonedeep';
import { User } from '@engspace/core';
import { useUserSearch } from './user';

const colText: { [prop: string]: string } = {
    name: 'Id',
    email: 'E-Mail',
    fullName: 'Name',
};

export default defineComponent({
    props: {
        /**
         * The title shown in the Card title area
         */
        title: {
            type: String,
            default: 'Find users',
        },
        /**
         * Label of the search field
         */
        searchLabel: {
            type: String,
            default: 'Search by name, id or email',
        },
        /**
         * The columns to show in the data table.
         */
        columns: {
            type: Array,
            default: () => ['name', 'email', 'fullName'],
            validate: (val: string[]) => val.every((v) => v in colText),
        },
        /**
         * The initial search to start with.
         * This prop is being watched, so a later reassignment will also reset the actual search.
         */
        initialSearch: {
            type: String,
            default: '',
        },
        /**
         * If true, an empty search yields all users. Otherwise it yields an emtpy table.
         */
        emptyAll: {
            type: Boolean,
            default: false,
        },
        /**
         * Whether user roles should be fetched.
         */
        fetchRoles: {
            type: Boolean,
            default: false,
        },
        /**
         * Whether a user can be selected
         */
        selectable: {
            type: Boolean,
            default: false,
        },
        /**
         * The currently selected user.
         * value.id is used to highlight the user row.
         */
        value: {
            type: Object,
            default: null,
        },
    },
    setup(
        props: {
            columns: string[];
            initialSearch: string;
            emptyAll: boolean;
            fetchRoles: boolean;
            selectable: boolean;
            value: User;
        },
        { emit }
    ) {
        const headers = computed(() =>
            props.columns.map((col) => ({
                text: colText[col],
                value: col,
            }))
        );

        const search = ref(props.initialSearch);
        const page = ref(1);
        const itemsPerPage = ref(10);
        const { emptyAll, fetchRoles } = toRefs(props);

        const { users, count, error, loading } = useUserSearch({
            search,
            page,
            itemsPerPage,
            emptyAll,
            fetchRoles,
        });

        watch(
            () => props.initialSearch,
            (newSearch) => {
                search.value = newSearch;
            }
        );

        // reset selection if it is not in the list
        watch(users, (newUsers) => {
            if (props.selectable && props.value) {
                if (newUsers && newUsers.find((user: User) => user.id === props.value.id)) {
                    return;
                }
                emit('input', null);
            }
        });

        function selectUser(user: User | undefined) {
            if (props.selectable) {
                emit('input', cloneDeep(user));
            }
        }

        return {
            headers,

            search,
            page,
            itemsPerPage,
            users,
            count,
            error,
            loading,

            selectUser,
        };
    },
});
</script>
