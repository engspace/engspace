export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function toBool(str: string|number|boolean): boolean {
    switch (str) {
    case true:
    case 'true':
    case 1:
    case '1':
    case 'on':
    case 'yes':
        return true;
    default:
        return false;
    }
}
