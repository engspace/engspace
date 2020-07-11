<template>
    <v-expansion-panels>
        <v-expansion-panel>
            <v-expansion-panel-header>Create new users</v-expansion-panel-header>
            <v-expansion-panel-content>
                <v-form ref="createForm" v-model="createValid">
                    <v-card max-width="400">
                        <v-card-text>
                            <es-user-edit
                                v-model="createUser"
                                :editable-fields="['name', 'email', 'fullName', 'roles']"
                                :name-conflict="createNameConflict"
                                :email-conflict="createEmailConflict"
                            ></es-user-edit>
                        </v-card-text>
                        <v-card-actions>
                            <v-spacer></v-spacer>
                            <es-success-btn
                                class="mr-4"
                                :anim-state="createAnimState"
                                :disabled="!createValid"
                                @click="createMutate({ input: createUser })"
                            >
                                <v-icon>mdi-plus</v-icon>
                                Create
                            </es-success-btn>
                        </v-card-actions>
                        <v-card-subtitle>
                            <v-alert
                                v-if="!!createError"
                                type="error"
                                dense
                                colored-border
                                border="right"
                            >
                                {{ createError }}
                            </v-alert>
                        </v-card-subtitle>
                    </v-card>
                </v-form>
            </v-expansion-panel-content>
        </v-expansion-panel>

        <v-expansion-panel>
            <v-expansion-panel-header>Edit existing users</v-expansion-panel-header>
            <v-expansion-panel-content>
                <v-container>
                    <v-row>
                        <v-col cols="12" md="8">
                            <es-user-finder
                                v-model="updateSelected"
                                :selectable="true"
                                :fetch-roles="true"
                            ></es-user-finder>
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-form ref="updateForm" v-model="updateValid" :lazy-validation="true">
                                <v-card max-width="400">
                                    <v-card-text>
                                        <es-user-edit
                                            v-model="updateUser"
                                            :editable-fields="[
                                                'name',
                                                'email',
                                                'fullName',
                                                'roles',
                                            ]"
                                            :name-conflict="updateNameConflict"
                                            :email-conflict="updateEmailConflict"
                                        ></es-user-edit>
                                    </v-card-text>
                                    <v-card-actions>
                                        <v-spacer></v-spacer>
                                        <es-success-btn
                                            class="mr-4"
                                            :anim-state="updateAnimState"
                                            :disabled="!updateEnabled"
                                            @click="updateMutate(updateUser)"
                                        >
                                            <v-icon>mdi-pencil</v-icon>
                                            Update
                                        </es-success-btn>
                                    </v-card-actions>
                                    <v-card-subtitle>
                                        <v-alert
                                            v-if="!!updateError"
                                            type="error"
                                            dense
                                            colored-border
                                            border="right"
                                        >
                                            {{ updateError }}
                                        </v-alert>
                                    </v-card-subtitle>
                                </v-card>
                            </v-form>
                        </v-col>
                    </v-row>
                </v-container>
            </v-expansion-panel-content>
        </v-expansion-panel>
    </v-expansion-panels>
</template>

<script lang="ts">
import { useMutation } from '@vue/apollo-composable';
import { computed, defineComponent, ref, watch } from '@vue/composition-api';
import gql from 'graphql-tag';
import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import { useSuccessAnimate, USER_FIELDS, useUserConflicts } from '@engspace/client-comps';
import { User } from '@engspace/core';

const USER_CREATE = gql`
    mutation CreateUser($input: UserInput!) {
        userCreate(input: $input) {
            ...UserFields
            roles
        }
    }
    ${USER_FIELDS}
`;

export const USER_UPDATE = gql`
    mutation UpdateUser($id: ID!, $input: UserInput!) {
        userUpdate(id: $id, input: $input) {
            ...UserFields
            roles
        }
    }
    ${USER_FIELDS}
`;

function useUserCreate() {
    const form = ref(null);
    const valid = ref(false);
    const user = ref({});
    const { mutate, error: mutateError, onDone, onError } = useMutation(USER_CREATE, {
        refetchQueries: ['SearchUsers'],
    });

    const {
        name: nameConflict,
        email: emailConflict,
        error: conflictQueryError,
    } = useUserConflicts({
        user,
    });

    const { animState, animate } = useSuccessAnimate();

    onDone(() => {
        user.value = {};
        animate({ success: true });
        ((form.value as unknown) as any)?.resetValidation();
    });

    onError((err) => {
        console.log(err);
        animate({ success: false });
    });

    return {
        form,
        valid,
        user,
        mutate,
        nameConflict,
        emailConflict,
        animState,
        error: computed(() => mutateError.value || conflictQueryError.value),
    };
}

function useUserUpdate() {
    const form = ref(null);
    const valid = ref(false);
    const selected = ref(null);
    const user = ref(null);

    watch(selected, (usr) => {
        user.value = cloneDeep(usr);
        ((form.value as unknown) as any)?.resetValidation();
    });

    const { mutate, error: mutateError, onDone, onError } = useMutation(USER_UPDATE);

    const { animState, animate } = useSuccessAnimate();

    const {
        name: nameConflict,
        email: emailConflict,
        error: conflictQueryError,
    } = useUserConflicts({
        user,
    });

    onDone(() => {
        animate({ success: true });
        selected.value = cloneDeep(user.value);
    });
    onError((err) => {
        console.log(err);
        animate({ success: false });
    });

    return {
        form,
        valid,
        enabled: computed(
            () => valid.value && !!user.value && !isEqual(user.value, selected.value)
        ),
        user,
        mutate({ id, name, email, fullName, roles }: User) {
            mutate({
                id,
                input: {
                    name,
                    email,
                    fullName,
                    roles,
                },
            });
        },
        nameConflict,
        emailConflict,
        animState,
        error: computed(() => mutateError.value || conflictQueryError.value),
        selected,
    };
}

export default defineComponent({
    setup() {
        const {
            form: createForm,
            valid: createValid,
            user: createUser,
            mutate: createMutate,
            nameConflict: createNameConflict,
            emailConflict: createEmailConflict,
            animState: createAnimState,
            error: createError,
        } = useUserCreate();

        const {
            form: updateForm,
            valid: updateValid,
            enabled: updateEnabled,
            user: updateUser,
            mutate: updateMutate,
            nameConflict: updateNameConflict,
            emailConflict: updateEmailConflict,
            animState: updateAnimState,
            error: updateError,
            selected: updateSelected,
        } = useUserUpdate();

        return {
            createForm,
            createValid,
            createUser,
            createMutate,
            createNameConflict,
            createEmailConflict,
            createAnimState,
            createError,

            updateForm,
            updateValid,
            updateEnabled,
            updateUser,
            updateMutate,
            updateNameConflict,
            updateEmailConflict,
            updateAnimState,
            updateError,
            updateSelected,
        };
    },
});
</script>
