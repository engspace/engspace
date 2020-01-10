<template>
    <search-panel v-model="search" title="Documents" :debounce-ms="500">
        <document-table
            :documents="documentSearch.documents"
            :items-per-page.sync="itemsPerPage"
            :page.sync="page"
            :items-server-length="documentSearch.count"
            @checkout="checkout($event)"
            @discard-checkout="discardCheckout($event)"
        ></document-table>
    </search-panel>
</template>

<script>
import DocumentTable from './DocumentTable';
import SearchPanel from './SearchPanel';
import gql from 'graphql-tag';
import { DOCUMENT_FIELDS, DOCUMENT_REV_FIELDS } from '../graphql';

const SEARCH_DOCS = gql`
    query SearchDocuments($search: String!, $offset: Int!, $limit: Int!) {
        documentSearch(search: $search, offset: $offset, limit: $limit) {
            count
            documents {
                ...DocumentFields
                lastRevision {
                    ...DocumentRevFields
                }
            }
        }
    }
    ${DOCUMENT_FIELDS}
    ${DOCUMENT_REV_FIELDS}
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
        };
    },
    apollo: {
        documentSearch: {
            query: SEARCH_DOCS,
            variables() {
                return {
                    search: this.search,
                    offset: (this.page - 1) * this.itemsPerPage,
                    limit: this.itemsPerPage,
                };
            },
        },
    },
    methods: {
        checkout(doc) {
            this.$apollo.mutate({
                mutation: gql`
                    mutation CheckoutDoc($id: ID!) {
                        documentCheckout(id: $id) {
                            ...DocumentFields
                            lastRevision {
                                ...DocumentRevFields
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
        discardCheckout(doc) {
            this.$apollo.mutate({
                mutation: gql`
                    mutation CheckoutDoc($id: ID!) {
                        documentDiscardCheckout(id: $id) {
                            ...DocumentFields
                            lastRevision {
                                ...DocumentRevFields
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
    },
};
</script>
