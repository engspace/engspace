<template>
    <v-expansion-panels>
        <v-expansion-panel>
            <v-expansion-panel-header>Create new users</v-expansion-panel-header>
            <v-expansion-panel-content>
                <v-card max-width="400">
                    <v-card-text>
                        <es-user-edit v-model="createdUser"></es-user-edit>
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <es-success-btn
                            class="mr-4"
                            :anim-state="createAnimState"
                            :disabled="!createdUser"
                            @click="createUser({ input: user })"
                        >
                            <v-icon>mdi-content-save</v-icon>
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
            </v-expansion-panel-content>
        </v-expansion-panel>

        <v-expansion-panel>
            <v-expansion-panel-header>Edit existing users</v-expansion-panel-header>
            <v-expansion-panel-content>
                <v-container>
                    <v-row>
                        <v-col cols="12" md="8">
                            <es-user-finder
                                v-model="updatedUser"
                                :selectable="true"
                                :fetch-roles="true"
                            ></es-user-finder>
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-card max-width="400">
                                <v-card-text>
                                    <es-user-edit v-model="updatedUser"></es-user-edit>
                                </v-card-text>
                                <v-card-actions>
                                    <v-spacer></v-spacer>
                                    <es-success-btn
                                        class="mr-4"
                                        :anim-state="updateAnimState"
                                        :disabled="!updatedUser"
                                        @click="updateUser(updatedUser)"
                                    >
                                        <v-icon>mdi-content-save</v-icon>
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
                        </v-col>
                    </v-row>
                </v-container>
            </v-expansion-panel-content>
        </v-expansion-panel>
    </v-expansion-panels>
</template>
<script lang="ts">
import { useMutation } from '@vue/apollo-composable';
import { computed, defineComponent, ref } from '@vue/composition-api';
import gql from 'graphql-tag';
import { useSuccessAnimate, USER_FIELDS } from '@engspace/client-comps';
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

export default defineComponent({
    setup() {
        const createdUser = ref(null);
        const {
            mutate: createUser,
            error: createError,
            onDone: onCreateDone,
            onError: onCreateError,
        } = useMutation(USER_CREATE, {
            refetchQueries: ['SearchUsers'],
        });

        const { animState: createAnimState, animate: createAnimate } = useSuccessAnimate();

        onCreateDone(() => {
            createdUser.value = null;
            createAnimate({ success: true });
        });

        onCreateError((err) => {
            console.log(err);
            createAnimate({ success: false });
        });

        const updatedUser = ref(null);
        const {
            mutate: updateUser,
            error: updateError,
            onDone: onUpdateDone,
            onError: onUpdateError,
        } = useMutation(USER_UPDATE);

        const { animState: updateAnimState, animate: updateAnimate } = useSuccessAnimate();

        onUpdateDone(() => {
            updateAnimate({ success: true });
        });
        onUpdateError((err) => {
            console.log(err);
            updateAnimate({ success: false });
        });

        return {
            createAnimState,
            createdUser,
            createUser,
            createError: computed(() => createError.value?.message),

            updateAnimState,
            updatedUser,
            updateUser({ id, name, email, fullName, roles }: User) {
                updateUser({
                    id,
                    input: {
                        name,
                        email,
                        fullName,
                        roles,
                    },
                });
            },
            updateError: computed(() => updateError.value?.message),
        };
    },
});
</script>
