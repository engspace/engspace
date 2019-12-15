<template>
    <v-container fluid fill-height>
        <v-layout align-center justify-center>
            <v-flex xs12 sm8 md4>
                <v-form @submit.prevent="login">
                    <v-card elevation-12>
                        <v-toolbar dark color="primary">
                            <v-toolbar-title>Enter credentials</v-toolbar-title>
                        </v-toolbar>
                        <v-card-text>
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
            </v-flex>
        </v-layout>
    </v-container>
</template>

<script>
import { Api } from '../api';

import { AUTH_LOGIN } from '../store/actions';

export default {
    name: 'LoginPage',
    data() {
        return {
            nameOrEmail: '',
            password: '',
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
            const resp = await Api.get('/auth/first_admin');
            const { hasAdmin } = resp.data;
            if (!hasAdmin) {
                this.$router.push('/first_admin');
            }
        } catch (err) {
            console.error(err);
        }
    },
    methods: {
        async login() {
            const { nameOrEmail, password } = this;
            await this.$store.dispatch(AUTH_LOGIN, { nameOrEmail, password });
            if (this.$store.getters.isAuth) {
                this.wrongCred = false;
                const { redirect } = this.$route.query;
                this.$router.push(redirect || '/');
            } else {
                this.wrongCred = true;
            }
        },
    },
};
</script>
