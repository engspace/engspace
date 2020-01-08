<template>
    <span>
        <span :class="['mx-3', textClass]">{{
            checkout ? checkout.fullName : 'Not checked-out'
        }}</span>
        <v-btn v-if="otherCheckout" :href="`mailto:${checkout.email}`">
            <v-icon>mdi-email</v-icon>
        </v-btn>
        <v-switch
            v-if="canCheckout || selfCheckout"
            class="d-inline-block"
            :input-value="selfCheckout"
            @change="$emit('checkout', $event)"
        ></v-switch>
    </span>
</template>

<script>
export default {
    props: {
        checkout: {
            type: Object,
            default: null,
        },
    },
    computed: {
        otherCheckout() {
            return this.checkout && this.checkout.id !== this.$store.getters.userId;
        },
        canCheckout() {
            return !this.checkout && this.hasUserPerm('document.revise');
        },
        selfCheckout() {
            return this.checkout && this.checkout.id === this.$store.getters.userId;
        },
        textClass() {
            return this.checkout ? 'value' : 'text--darken-2';
        },
    },
};
</script>
