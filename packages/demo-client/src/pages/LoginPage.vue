<template>
    <v-container fluid class="fill-height">
        <v-row align="center" justify="center">
            <v-col cols="12" sm="8" md="4">
                <v-form @submit.prevent="login">
                    <v-card class="elevation-12">
                        <v-toolbar dark color="primary" flat>
                            <v-toolbar-title>
                                Enter your
                                <span class="es-logo text--secondary">{engspace}</span> credentials
                            </v-toolbar-title>
                        </v-toolbar>
                        <v-card-text>
                            <p v-show="networkError" class="error--text">
                                Server unreachable!
                            </p>
                            <p v-show="wrongCred" class="error--text">
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

<script lang="ts">
import { ref, defineComponent } from '@vue/composition-api';
import HttpStatus from 'http-status-codes';
import { api } from '../api';

import { useAuth } from '../auth';

export default defineComponent({
    name: 'LoginPage',
    setup(props, { root }) {
        const nameOrEmail = ref('');
        const password = ref('');
        const networkError = ref(false);
        const wrongCred = ref(false);
        const showPswd = ref(false);
        const rules = {
            required: (value: string) => {
                return !!value || 'Required.';
            },
        };

        const auth = useAuth();

        async function login() {
            wrongCred.value = false;
            networkError.value = false;
            try {
                const resp = await api.post('/api/login', {
                    nameOrEmail: nameOrEmail.value,
                    password: password.value,
                });
                if (resp.status === HttpStatus.OK) {
                    auth.login(resp.data.token);
                    const { $router, $route } = root;
                    const { redirect } = $route.query;
                    $router.push((redirect as string | undefined) || '/');
                } else {
                    wrongCred.value = true;
                }
            } catch (err) {
                console.log(err);
                networkError.value = true;
            }
        }

        return {
            nameOrEmail,
            password,
            networkError,
            wrongCred,
            showPswd,
            rules,

            login,
        };
    },
});
</script>

<style>
.es-logo {
    font-family: 'Fira Code', 'Lucida Console', Monaco, monospace;
}
</style>
