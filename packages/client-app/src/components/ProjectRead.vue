<template>
    <v-card>
        <v-card-title>{{ project.name }}</v-card-title>
        <v-card-subtitle><span class="label">Id:</span>&nbsp;{{ project.id }}</v-card-subtitle>
        <v-card-text>
            <v-container>
                <v-row>
                    <v-col tag="span" class="label" :cols="4">code:</v-col>
                    <v-col tag="span" class="value" :cols="8">{{ project.code }}</v-col>
                </v-row>
                <v-row>
                    <v-col tag="span" class="label" :cols="4">description:</v-col>
                    <v-col tag="span" class="value" :cols="8">{{ project.description }}</v-col>
                </v-row>
            </v-container>
        </v-card-text>
    </v-card>
</template>
<script>
import { CProject } from '@engspace/core';

export default {
    props: {
        project: {
            type: Object,
            default() {
                return new CProject();
            },
        },
    },
};
</script>
