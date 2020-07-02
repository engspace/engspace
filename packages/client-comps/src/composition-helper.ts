import { Ref, isRef } from '@vue/composition-api';

export type RefOrRaw<T> = Ref<T> | T;

export function unref<T>(val: RefOrRaw<T>): T;
export function unref<T>(val: RefOrRaw<T> | undefined): T | undefined {
    return isRef(val) ? val.value : val;
}
