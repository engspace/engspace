<template>
    <v-expansion-panel>
        <v-expansion-panel-header>
            <template v-slot:default="{ open }">
                {{ title }}
                <v-spacer></v-spacer>
                <v-scale-transition>
                    <v-text-field
                        v-if="open"
                        v-model="searchModel"
                        autofocus
                        append-icon="mdi-search"
                        :label="searchLabel"
                        @click.stop=""
                    ></v-text-field>
                </v-scale-transition>
            </template>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
            <slot name="default"></slot>
        </v-expansion-panel-content>
    </v-expansion-panel>
</template>

<script>
import debounce from 'lodash.debounce';

export default {
    props: {
        title: {
            type: String,
            default: '',
        },
        value: {
            type: String,
            default: '',
        },
        searchLabel: {
            type: String,
            default: 'Search',
        },
        debounceMs: {
            type: Number,
            default: 0,
        },
    },
    data() {
        return {
            searchModel: this.value,
        };
    },
    watch: {
        searchModel() {
            this.debouncedEmit();
        },
    },
    created() {
        if (this.debounceMs > 0) {
            this.debouncedEmit = debounce(this.emitInput, this.debounceMs);
        } else {
            this.debouncedEmit = this.emitInput;
        }
    },
    methods: {
        emitInput() {
            this.$emit('input', this.searchModel);
        },
    },
};
</script>
