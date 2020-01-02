<template>
    <v-card>
        <v-card-title>
            {{ user.fullName }}
            <v-spacer></v-spacer>
            <slot name="action"></slot>
        </v-card-title>
        <v-card-subtitle>
            <span class="label">Id:</span>
            &nbsp;
            <span>{{ user.id }}</span>
        </v-card-subtitle>
        <v-card-text>
            <v-container>
                <v-row>
                    <v-col :cols="3" tag="span" class="label">Login</v-col>
                    <v-col :cols="9" tag="span" class="value">{{ user.name }}</v-col>
                </v-row>
                <v-row>
                    <v-col :cols="3" tag="span" class="label">E-Mail</v-col>
                    <v-col :cols="9" tag="span" class="value">{{ user.email }}</v-col>
                </v-row>
                <v-row>
                    <v-col :cols="3" tag="span" class="label">
                        Roles:
                    </v-col>
                    <v-col :cols="9" tag="span" class="value">
                        {{ roleString }}
                    </v-col>
                </v-row>
            </v-container>
        </v-card-text>
    </v-card>
</template>

<script>
import { CUser } from '@engspace/core';
import upperFirst from 'lodash.upperfirst';

export default {
    props: {
        user: {
            type: Object,
            default: () => new CUser(),
        },
    },
    computed: {
        roleString() {
            return this.user.roles.map(r => upperFirst(r)).join(', ');
        },
    },
};
</script>
