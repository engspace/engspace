import { reactive } from '@vue/composition-api';
import { waitMs } from '../utils';

export interface AnimState {
    value: boolean;
    success: boolean;
}

export function useSuccessAnimate() {
    const animState = (reactive({
        value: false,
        success: true,
    }) as unknown) as AnimState;

    async function animate({ success = true, ms = 1000 }: { success?: boolean; ms?: number } = {}) {
        animState.success = success;
        animState.value = true;

        await waitMs(ms);

        animState.value = false;
    }

    return {
        animState,
        animate,
    };
}
