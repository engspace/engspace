<template>
    <v-container fluid>
        <v-row>
            <v-col :cols="12" :md="8">
                <user-finder v-model="currentUserId"></user-finder>
            </v-col>
            <v-col :cols="12" :md="4">
                <user-component
                    v-show="currentUserId"
                    :user="currentUser"
                    :loading="loading"
                ></user-component>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import UserComponent from '../components/UserComponent';
import UserFinder from '../components/UserFinder';
import { CUser } from '@engspace/core';
import gql from 'graphql-tag';
import { apolloClient } from '../apollo';

const USER = gql`
    query GetUser($id: ID!) {
        user(id: $id) {
            id
            name
            email
            fullName
            roles
        }
    }
`;

export default {
    components: {
        UserComponent,
        UserFinder,
    },
    data() {
        return {
            currentUserId: '',
            currentUser: new CUser(),
            loading: false,
        };
    },
    watch: {
        async currentUserId() {
            if (!this.currentUserId) {
                this.currentUser = new CUser();
                return;
            }
            this.loading = true;
            const res = await apolloClient.query({
                query: USER,
                variables: {
                    id: this.currentUserId,
                },
            });
            this.currentUser = res.data.user;
            this.loading = false;
        },
    },
};
</script>
