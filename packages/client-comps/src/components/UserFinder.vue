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
                <tr>
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
    },
    setup(props: { columns: string[]; initialSearch: string; emptyAll: boolean }) {
        const search = ref(props.initialSearch);
        const page = ref(1);
        const itemsPerPage = ref(10);
        const { emptyAll } = toRefs(props);

        const { users, count, error, loading } = useUserSearch({
            search,
            page,
            itemsPerPage,
            emptyAll,
        });

        watch(
            () => props.initialSearch,
            (newSearch) => {
                search.value = newSearch;
            }
        );

        const headers = computed(() =>
            props.columns.map((col) => ({
                text: colText[col],
                value: col,
            }))
        );

        return {
            search,
            page,
            itemsPerPage,
            users,
            count,
            error,
            loading,

            headers,
        };
    },
});
</script>
