<template>
    <v-data-table
        :items="documents"
        :headers="headers"
        :items-per-page="itemsPerPage"
        :page="page"
        @update:items-per-page="$emit('update:items-per-page', $event)"
        @update:page="$emit('update:page', $event)"
    >
        <template v-slot:item.createdBy="{ item }">
            {{ item.createdBy.fullName }}
        </template>
        <template v-slot:item.lastRevision="{ item }">
            <document-revision :document="item"></document-revision>
        </template>
        <template v-slot:item.checkout="{ item }">
            <document-checkout
                :checkout="item.checkout"
                @checkout="emitCheckout(item, $event)"
            ></document-checkout>
        </template>
    </v-data-table>
</template>

<script>
import DocumentCheckout from './DocumentCheckout';
import DocumentRevision from './DocumentRevision';

const colText = {
    name: 'Name',
    createdBy: 'Created by',
    lastRevision: 'Last Revision',
    checkout: 'Current Check-out',
};

export default {
    components: {
        DocumentCheckout,
        DocumentRevision,
    },
    props: {
        documents: {
            type: Array,
            required: true,
        },
        columns: {
            type: Array,
            default: () => ['name', 'createdBy', 'lastRevision', 'checkout'],
        },
        itemsPerPage: {
            type: Number,
            default: 10,
        },
        page: {
            type: Number,
            default: 1,
        },
    },
    computed: {
        headers() {
            return this.columns.map(c => ({
                value: c,
                text: colText[c],
            }));
        },
    },
    methods: {
        emitCheckout(document, check) {
            if (check) {
                this.$emit('checkout', document);
            } else {
                this.$emit('discard-checkout', document);
            }
        },
    },
};
</script>
