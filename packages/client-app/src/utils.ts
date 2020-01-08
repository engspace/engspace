export function waitMs(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

const prefixes = ['', 'k', 'M', 'G', 'T'];

export function byteSizeStr(bytes: number): string {
    let sz = bytes;
    let prefInd = 0;
    while (sz > 1024 && prefInd < prefixes.length - 1) {
        sz /= 1024;
        prefInd += 1;
    }
    return `${sz.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${prefixes[prefInd]}B`;
}
