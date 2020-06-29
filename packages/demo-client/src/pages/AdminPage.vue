<template>
    <div>
        <es-user-edit-card
            title="Create user"
            :show-id="false"
            :error="createError"
            :user="createdUser"
        >
            <template v-slot:action="{ user }">
                <es-success-btn :anim-state="createAnimState" @click="createUser({ input: user })">
                    <v-icon>mdi-content-save</v-icon>
                    Create
                </es-success-btn>
            </template>
        </es-user-edit-card>
    </div>
</template>
<script lang="ts">
import { useMutation } from '@vue/apollo-composable';
import { defineComponent, ref, computed } from '@vue/composition-api';
import gql from 'graphql-tag';
import { useSuccessAnimate } from '@engspace/client-comps';

const CREATE_USER = gql`
    mutation CreateUser($input: UserInput!) {
        userCreate(input: $input) {
            id
            name
            email
            fullName
            roles
        }
    }
`;

export default defineComponent({
    setup() {
        const createdUser = ref({});
        const {
            mutate: createUser,
            error: createErrorGql,
            onDone: onCreateDone,
            onError: onCreateError,
        } = useMutation(CREATE_USER);

        const { animState: createAnimState, animate: createAnimate } = useSuccessAnimate();

        onCreateDone(() => {
            createdUser.value = {};
            createAnimate({ success: true });
        });

        onCreateError(() => {
            createAnimate({ success: false });
        });

        const createError = computed(() => createErrorGql.value?.toString());

        return {
            createAnimState,
            createdUser,
            createUser,
            createError,
        };
    },
});
</script>
