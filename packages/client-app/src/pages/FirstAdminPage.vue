<template>
    <v-container fluid fill-height>
        <v-layout align-center justify-center>
            <v-flex xs12 sm8 md4>
                <v-form @submit.prevent="register">
                    <v-card elevation-12>
                        <v-toolbar dark color="primary">
                            <v-toolbar-title>Create first admin account</v-toolbar-title>
                        </v-toolbar>
                        <v-card-text>
                            <div v-if="errors.length">
                                <ul>
                                    <li v-for="(error, id) in errors" :key="id">
                                        {{ error }}
                                    </li>
                                </ul>
                            </div>
                            <v-switch v-model="useEmailAsUserId" :label="'Use E-Mail as User Id'" />
                            <v-text-field
                                v-if="!useEmailAsUserId"
                                v-model="name"
                                prepend-icon="mdi-account"
                                name="userId"
                                type="text"
                                label="User Id"
                                required
                            />
                            <v-text-field
                                v-model="email"
                                prepend-icon="mdi-email"
                                name="email"
                                type="email"
                                label="E-Mail"
                                required
                            />
                            <v-text-field
                                v-model="fullName"
                                prepend-icon="mdi-account"
                                name="fullname"
                                type="text"
                                label="Full Name"
                            />
                            <v-text-field
                                v-model="password"
                                prepend-icon="mdi-lock"
                                name="password"
                                type="password"
                                label="Password"
                                required
                            />
                            <v-text-field
                                v-model="passwordCheck"
                                prepend-icon="mdi-lock"
                                name="password_check"
                                type="password"
                                required
                                label="Password Check"
                            />
                            <v-checkbox v-model="manager" label="Manager" />
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer />
                            <v-btn color="primary" type="submit">
                                Submit
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-form>
            </v-flex>
        </v-layout>
    </v-container>
</template>

<script>
import { api } from '../api';
import { AUTH_LOGIN_ACTION } from '../store';

export default {
    name: 'RegisterPage',
    data() {
        return {
            errors: [],
            useEmailAsUserId: false,
            name: '',
            email: '',
            fullName: '',
            password: '',
            passwordCheck: '',
            manager: true,
        };
    },
    async created() {
        try {
            const resp = await api.get('/api/auth/first_admin');
            const { hasAdmin } = resp.data;
            if (hasAdmin) {
                this.$router.push('/');
            }
        } catch (_) {
            // continue
        }
    },
    methods: {
        async register() {
            const form = {
                name: this.useEmailAsUserId ? this.email : this.name,
                email: this.email,
                fullName: this.fullName,
                password: this.password,
                manager: this.manager,
            };
            await api.post('/api/auth/first_admin', form);
            const resp = await api.post('/api/auth/login', {
                nameOrEmail: form.name,
                password: form.password,
            });
            this.$store.dispatch(AUTH_LOGIN_ACTION, resp.data.token);
            this.$router.push('/');
        },
    },
};
</script>
