<template>
    <v-container fluid>
        <v-layout>
            <v-flex tag="h1">
                Users administration
            </v-flex>
        </v-layout>
        <v-layout>
            <v-flex>
                <v-tabs>
                    <v-tab>Find user</v-tab>
                    <v-tab-item>
                        <user-finder />
                    </v-tab-item>
                </v-tabs>
            </v-flex>
        </v-layout>
    </v-container>
</template>

<script lang="ts">
import Vue from 'vue';
import UserFinder from '../components/UserFinder.vue';

export default Vue.extend({
    components: {
        UserFinder,
    },
});
</script>
