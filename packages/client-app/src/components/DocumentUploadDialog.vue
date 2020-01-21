<template>
    <v-dialog :value="value && loading === false" @input="$emit('input', $event)">
        <template v-slot:activator="{ on }">
            <slot name="activator" :on="on">
                <v-btn small v-on="on">
                    <v-icon small>mdi-upload</v-icon>
                </v-btn>
            </slot>
        </template>
        <v-card>
            <v-card-title>
                Upload file revision for "<span class="label">{{ name }}</span
                >"
            </v-card-title>
            <v-card-text>
                <v-file-input
                    label="Select file to upload"
                    show-size
                    @change="file = $event"
                ></v-file-input>
                <v-textarea v-model="changeDescription" label="Change description"></v-textarea>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="$emit('input', false)">Cancel</v-btn>
                <v-btn :disabled="!file" @click="done">Done</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
export default {
    props: {
        name: {
            type: String,
            required: true,
        },
        value: {
            type: Boolean,
            default: false,
        },
        loading: {
            type: [Number, Boolean],
            default: false,
        },
    },
    data() {
        return {
            file: null,
            changeDescription: '',
        };
    },
    methods: {
        done() {
            if (this.file) {
                const { file, changeDescription } = this;
                this.$emit('upload', { file, changeDescription });
                this.$emit('input', false);
            }
        },
    },
};
</script>
