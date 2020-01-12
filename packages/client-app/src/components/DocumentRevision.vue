<template>
    <span>
        <span v-if="hasLastRev">
            <span class="label mx-3">{{ document.lastRevision.revision }}</span>
            <a v-if="canRead" download @click="download()">{{ document.lastRevision.filename }}</a>
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
import { api, apiUrl, buildQuery, authHeader, query } from '../api';

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
            return apiUrl(
                `/api/document${buildQuery({
                    id: this.document.id,
                    rev: this.document.lastRevision.revision,
                })}`
            );
        },
    },
    methods: {
        async download() {
            try {
                const resp = await api.get(
                    query('/api/document/download_token', {
                        documentId: this.document.id,
                        revision: this.document.lastRevision.revision,
                    }),
                    {
                        headers: authHeader(),
                    }
                );
                const { downloadToken } = resp.data;
                console.log('data:');
                console.log(resp.data);
                const url = apiUrl(`/api/document/download${buildQuery({ token: downloadToken })}`);
                console.log(url);
                window.location = url;
            } catch (err) {
                //
            }
        },
    },
};
</script>
