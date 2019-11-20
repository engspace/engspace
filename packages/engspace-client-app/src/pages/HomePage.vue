<template>
    <div>
        <v-expansion-panel>
            <v-expansion-panel-content>
                <template v-slot:header>
                    <div>Projects</div>
                </template>
                <project-table />
            </v-expansion-panel-content>
        </v-expansion-panel>
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
