export function useModelUtils(
    props: any,
    emit: (event: string, value: any) => void,
    prop = 'value',
    inputEvent = 'input'
) {
    function updateValue(key: string, value: string) {
        emit(inputEvent, { ...props[prop], [key]: value });
    }

    function updateList(key: string, member: string, value: boolean) {
        let list = props[prop]?.roles || [];
        if (value) {
            list = [...list, member];
        } else {
            list = list.filter((m: string) => m !== member);
        }
        emit(inputEvent, { ...props[prop], [key]: list });
    }

    return { updateValue, updateList };
}

export function useSyncUtils(props: any, emit: (event: string, value: any) => void, prop: string) {
    return useModelUtils(props, emit, prop, `${prop}.update`);
}

export const rules = {
    required: (val: string) => !!val || 'Required',
};
