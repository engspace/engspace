<template>
    <search-panel v-model="search" title="Documents" :debounce-ms="500">
        <p v-if="error" class="error--text">{{ error }}</p>
        <document-table
            :documents="documentSearch.documents"
            :items-per-page.sync="itemsPerPage"
            :page.sync="page"
            :items-server-length="documentSearch.count"
            @checkout="checkout($event)"
            @discard-checkout="discardCheckout($event)"
            @rev-upload="revUpload($event)"
        ></document-table>
    </search-panel>
</template>

<script>
import DocumentTable from './DocumentTable';
import SearchPanel from './SearchPanel';
import gql from 'graphql-tag';
import { apolloClient } from '../apollo';
import { DOCUMENT_FIELDS, DOCUMENT_REV_FIELDS } from '../graphql';
import { uploadFile } from '../services/upload';

const DOC_SEARCH_DOC_FIELDS = gql`
    fragment DocSearchDocFields on Document {
        ...DocumentFields
        lastRevision {
            ...DocumentRevFields
            document {
                ...DocumentFields
            }
        }
    }
    ${DOCUMENT_FIELDS}
    ${DOCUMENT_REV_FIELDS}
`;

const DOC_SEARCH_FIELDS = gql`
    fragment DocSearchFields on DocumentSearch {
        count
        documents {
            ...DocSearchDocFields
        }
    }
    ${DOC_SEARCH_DOC_FIELDS}
`;

const SEARCH_DOCS = gql`
    query SearchDocuments($search: String!, $offset: Int!, $limit: Int!) {
        documentSearch(search: $search, offset: $offset, limit: $limit) {
            ...DocSearchFields
        }
    }
    ${DOC_SEARCH_FIELDS}
`;

export default {
    components: {
        DocumentTable,
        SearchPanel,
    },
    data() {
        return {
            search: '',
            itemsPerPage: 10,
            page: 1,
            documentSearch: {
                count: 0,
                documents: [],
            },
            error: '',
        };
    },
    apollo: {
        documentSearch: {
            query: SEARCH_DOCS,
            variables() {
                return this.searchVars();
            },
        },
    },
    methods: {
        searchVars() {
            return {
                search: this.search,
                offset: (this.page - 1) * this.itemsPerPage,
                limit: this.itemsPerPage,
            };
        },
        async checkout(doc) {
            this.error = '';
            try {
                await this.$apollo.mutate({
                    mutation: gql`
                        mutation CheckoutDoc($id: ID!, $revision: Int!) {
                            documentCheckout(id: $id, revision: $revision) {
                                ...DocSearchDocFields
                            }
                        }
                        ${DOC_SEARCH_DOC_FIELDS}
                    `,
                    variables: {
                        id: doc.id,
                        revision: doc.lastRevision.revision,
                    },
                });
            } catch (err) {
                this.error = err.message;
            }
        },
        discardCheckout(doc) {
            this.$apollo.mutate({
                mutation: gql`
                    mutation CheckoutDoc($id: ID!) {
                        documentDiscardCheckout(id: $id) {
                            ...DocSearchDocFields
                            lastRevision {
                            }
                        }
                    }
                    ${DOCUMENT_FIELDS}
                    ${DOCUMENT_REV_FIELDS}
                `,
                variables: {
                    id: doc.id,
                },
            });
        },
        async revUpload({ document, file, changeDescription }) {
            const ind = this.documentSearch.documents.findIndex(d => d.id === document.id);
            const newRevInput = {
                documentId: document.id,
                filename: file.name,
                filesize: file.size,
                changeDescription,
                retainCheckout: false,
            };
            const result = await this.$apollo.mutate({
                mutation: gql`
                    mutation ReviseDoc($docRev: DocumentRevisionInput!) {
                        documentRevise(documentRevision: $docRev) {
                            ...DocumentRevFields
                            document {
                                ...DocumentFields
                            }
                        }
                    }
                    ${DOCUMENT_REV_FIELDS}
                    ${DOCUMENT_FIELDS}
                `,
                variables: {
                    docRev: newRevInput,
                },
                update: (store, { data: { documentRevise } }) => {
                    const queryOpts = {
                        query: SEARCH_DOCS,
                        variables: this.searchVars(),
                    };
                    const data = store.readQuery(queryOpts);
                    const doc = data.documentSearch.documents[ind];
                    if (doc.lastRevision) {
                        doc.lastRevision = documentRevise;
                    }
                    if (doc.revisions) {
                        doc.revisions = [...doc.revision, documentRevise];
                    }
                    store.writeQuery({ ...queryOpts, data });
                },
            });
            const rev = result.data.documentRevise;
            const path = `/api/document/upload?rev_id=${rev.id}`;
            const sha1 = await uploadFile(file, path, uploaded => {
                // TODO: writeFragment
                const queryOpts = {
                    query: SEARCH_DOCS,
                    variables: this.searchVars(),
                };
                const data = apolloClient.readQuery(queryOpts);
                const doc = data.documentSearch.documents[ind];
                if (doc.lastRevision) {
                    doc.lastRevision.uploaded = uploaded;
                }
                apolloClient.writeQuery({ ...queryOpts, data });
            });
            await this.$apollo.mutate({
                mutation: gql`
                    mutation CheckUpload($docRevId: ID!, $sha1: String!) {
                        documentRevisionCheck(docRevId: $docRevId, sha1: $sha1) {
                            ...DocumentRevFields
                            document {
                                ...DocumentFields
                            }
                        }
                    }
                    ${DOCUMENT_REV_FIELDS}
                    ${DOCUMENT_FIELDS}
                `,
                variables: {
                    docRevId: rev.id,
                    sha1,
                },
            });
        },
    },
};
</script>
