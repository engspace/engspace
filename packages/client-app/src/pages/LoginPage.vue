<template>
    <v-container fluid class="fill-height">
        <v-row align="center" justify="center">
            <v-col cols="12" sm="8" md="4">
                <v-form @submit.prevent="login">
                    <v-card class="elevation-12">
                        <v-toolbar dark color="primary" flat>
                            <v-toolbar-title>Enter credentials</v-toolbar-title>
                        </v-toolbar>
                        <v-card-text>
                            <p v-show="networkError" class="red--text">
                                Server unreachable!
                            </p>
                            <p v-show="wrongCred" class="red--text">
                                Wrong credentials. Try again!
                            </p>
                            <v-text-field
                                v-model="nameOrEmail"
                                prepend-icon="mdi-account"
                                name="userId"
                                type="text"
                                label="User Id or e-mail"
                                :rules="[rules.required]"
                                @change="wrongCred = false"
                            />
                            <v-text-field
                                v-model="password"
                                prepend-icon="mdi-lock"
                                :append-icon="showPswd ? 'mdi-eye' : 'mdi-eye-off'"
                                name="password"
                                :type="showPswd ? 'text' : 'password'"
                                label="Password"
                                :rules="[rules.required]"
                                @click:append="showPswd = !showPswd"
                                @change="wrongCred = false"
                            />
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer />
                            <v-btn color="primary" type="submit">
                                Login
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-form>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import HttpStatus from 'http-status-codes';
import { api } from '../api';

import { AUTH_LOGIN_ACTION } from '../store';

export default {
    name: 'LoginPage',
    data() {
        return {
            nameOrEmail: '',
            password: '',
            networkError: false,
            wrongCred: false,
            showPswd: false,
            rules: {
                required: value => {
                    return !!value || 'Required.';
                },
            },
        };
    },
    async created() {
        try {
            const resp = await api.get('/api/first_admin');
            const { hasAdmin } = resp.data;
            if (!hasAdmin) {
                this.$router.push('/first_admin');
            }
        } catch (err) {
            if (!err.response) {
                this.networkError = true;
            }
        }
    },
    methods: {
        async login() {
            const { nameOrEmail, password } = this;
            this.wrongCred = false;
            this.networkError = false;
            try {
                const resp = await api.post('/api/login', { nameOrEmail, password });
                if (resp.status === HttpStatus.OK) {
                    this.$store.dispatch(AUTH_LOGIN_ACTION, resp.data.token);
                    const { redirect } = this.$route.query;
                    this.$router.push(redirect || '/');
                } else {
                    this.wrongCred = true;
                }
            } catch (err) {
                this.networkError = true;
            }
        },
    },
};
</script>
