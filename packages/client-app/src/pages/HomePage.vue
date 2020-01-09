<template>
    <div>
        <v-expansion-panels>
            <project-search-panel></project-search-panel>
            <document-search-panel></document-search-panel>
        </v-expansion-panels>
    </div>
</template>

<script>
import DocumentSearchPanel from '../components/DocumentSearchPanel.vue';
import ProjectSearchPanel from '../components/ProjectSearchPanel.vue';

export default {
    components: {
        DocumentSearchPanel,
        ProjectSearchPanel,
    },
};
</script>
