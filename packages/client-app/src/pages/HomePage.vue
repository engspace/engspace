<template>
    <div>
        <v-expansion-panels>
            <v-expansion-panel>
                <v-expansion-panel-header>
                    Projects
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                    <project-table />
                </v-expansion-panel-content>
            </v-expansion-panel>
        </v-expansion-panels>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import ProjectTable from '../components/ProjectTable.vue';

export default Vue.extend({
    name: 'HomePage',
    components: { ProjectTable },
});
</script>
