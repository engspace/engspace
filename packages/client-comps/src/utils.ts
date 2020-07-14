import upperFirst from 'lodash.upperfirst';

export function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function roleString(roles: string[] | undefined): string | undefined {
    return roles?.map((r) => upperFirst(r)).join(', ');
}
