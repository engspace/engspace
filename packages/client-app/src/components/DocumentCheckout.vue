<template>
    <span>
        <span :class="['mx-3', textClass]">{{
            checkout ? checkout.fullName : 'Not checked-out'
        }}</span>
        <v-btn v-if="otherCheckout" small :href="`mailto:${checkout.email}`">
            <v-icon small>mdi-email</v-icon>
        </v-btn>
        <v-btn v-if="canCheckout || selfCheckout" small @click="$emit('checkout', !selfCheckout)">
            <v-icon small :color="selfCheckout ? 'accent' : 'grey'">
                {{ selfCheckout ? 'mdi-lock' : 'mdi-lock-open' }}
            </v-icon>
        </v-btn>
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
