export function waitMs(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

const prefixes = ['', 'k', 'M', 'G', 'T'];

export function byteSizeStr(bytes: number, base: 1000 | 1024 = 1000): string {
    let sz = bytes;
    let prefInd = 0;
    while (sz > base && prefInd < prefixes.length - 1) {
        sz /= base;
        prefInd += 1;
    }
    return `${sz.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${prefixes[prefInd]}B`;
}
