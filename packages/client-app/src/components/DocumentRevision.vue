<template>
    <span>
        <span class="label mx-3">{{ revision.revision }}</span>
        <a v-if="canRead" download @click="download()">{{ revision.filename }}</a>
        <span v-else>{{ revision.filename }}</span>
        <span class="mx-3">{{ byteSize }}</span>
        <document-upload-dialog
            v-if="selfCheckout && !uploadLoading"
            v-model="uploadDialog"
            small
            :name="document.name"
            @upload="upload"
        ></document-upload-dialog>
        <v-progress-circular v-if="uploadLoading" :value="uploadProgress">{{
            uploadProgress
        }}</v-progress-circular>
        <span v-if="checkingUpload">Checking upload...</span>
    </span>
</template>

<script>
import DocumentUploadDialog from './DocumentUploadDialog';
import { byteSizeStr } from '../utils';
import { api, apiUrl, buildQuery, authHeader, query } from '../api';

export default {
    components: {
        DocumentUploadDialog,
    },
    props: {
        revision: {
            type: Object,
            required: true,
        },
    },
    data() {
        return {
            uploadDialog: false,
        };
    },
    computed: {
        canRead() {
            return this.hasUserPerm('document.read');
        },
        byteSize() {
            return byteSizeStr(this.revision.filesize);
        },
        document() {
            return this.revision.document;
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
                    rev: this.revision.revision,
                })}`
            );
        },
        uploadLoading() {
            return this.revision.uploaded !== this.revision.filesize;
        },
        uploadProgress() {
            return Math.trunc(100 * (this.revision.uploaded / this.revision.filesize));
        },
        checkingUpload() {
            return !this.uploadLoading && !this.revision.sha1;
        },
    },
    methods: {
        async download() {
            try {
                const resp = await api.get(
                    query('/api/document/download_token', {
                        documentId: this.document.id,
                        revision: this.revision.revision,
                    }),
                    {
                        headers: authHeader(),
                    }
                );
                const { downloadToken } = resp.data;
                const url = apiUrl(`/api/document/download${buildQuery({ token: downloadToken })}`);
                window.location = url;
            } catch (err) {
                //
            }
        },
        upload(file) {
            this.$emit('upload', file);
        },
    },
};
</script>
