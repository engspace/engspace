<template>
    <v-card>
        <v-card-title>
            {{ user.fullName }}
            <v-spacer></v-spacer>
            <slot name="action"></slot>
        </v-card-title>
        <v-card-text>
            <v-container>
                <v-row>
                    <v-col :cols="3" tag="span" class="label">User Id</v-col>
                    <v-col :cols="9" tag="span" class="value">{{ user.name }}</v-col>
                </v-row>
                <v-row>
                    <v-col :cols="3" tag="span" class="label">E-Mail</v-col>
                    <v-col :cols="9" tag="span" class="value">{{ user.email }}</v-col>
                </v-row>
                <v-row>
                    <v-col :cols="3" tag="span" class="label">Roles:</v-col>
                    <v-col :cols="9" tag="span" class="value">{{ roleString }}</v-col>
                </v-row>
            </v-container>
        </v-card-text>
    </v-card>
</template>

<script>
import { toRefs, computed, defineComponent } from '@vue/composition-api';
import upperFirst from 'lodash.upperfirst';

export default defineComponent({
    name: 'EsUserCard',
    props: {
        user: {
            type: Object,
            default: () => ({ name: '', email: '', fullName: '', roles: [] }),
        },
    },
    setup(props) {
        const { user } = toRefs(props);
        const roleString = computed(() => user.value.roles.map((r) => upperFirst(r)).join(', '));
        return {
            roleString,
        };
    },
});
</script>
