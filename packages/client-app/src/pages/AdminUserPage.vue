<template>
    <div>
        <user-finder></user-finder>
        <user-component v-show="currentUser.id"></user-component>
    </div>
</template>

<script>
import { CUser } from '@engspace/core';
import UserComponent from '../components/UserComponent';
import UserFinder from '../components/UserFinder';

export default {
    components: {
        UserComponent,
        UserFinder,
    },
    data() {
        return {
            currentUser: new CUser(),
        };
    },
    computed: {},
};
</script>
