<template>
    <span>
        <span v-if="hasLastRev">
            <span class="label mx-3">{{ document.lastRevision.revision }}</span>
            <a v-if="canRead" :href="downloadUrl" download>{{ document.lastRevision.filename }}</a>
            <span v-else>{{ document.lastRevision.filename }}</span>
            <span class="mx-3">{{ byteSize }}</span>
        </span>
        <span v-else>(no upload yet)</span>
        <v-btn v-if="selfCheckout">
            <v-icon small>mdi-upload</v-icon>
        </v-btn>
    </span>
</template>

<script>
import { byteSizeStr } from '../utils';
export default {
    props: {
        document: {
            type: Object,
            required: true,
        },
    },
    computed: {
        canRead() {
            return this.hasUserPerm('document.read');
        },
        hasLastRev() {
            return !!this.document.lastRevision;
        },
        byteSize() {
            return byteSizeStr(this.document.lastRevision.filesize);
        },
        selfCheckout() {
            return (
                this.document.checkout && this.document.checkout.id === this.$store.getters.userId
            );
        },
        downloadUrl() {
            return encodeURI(
                `/document?id=${this.document.id}&rev=${this.document.lastRevision.revision}`
            );
        },
    },
};
</script>
