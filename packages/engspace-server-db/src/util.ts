export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function pad(num: number, digits: number): string {
    let res = '' + num;
    while (res.length < digits) {
        res = '0' + res;
    }
    return res;
}

export function dateToPgString(date: Date): string {
    let offset = -date.getTimezoneOffset();

    let year = date.getFullYear();
    const isBCYear = year < 1;
    if (isBCYear) year = Math.abs(year) + 1; // negative years are 1 off their BC representation

    let res =
        pad(year, 4) +
        '-' +
        pad(date.getMonth() + 1, 2) +
        '-' +
        pad(date.getDate(), 2) +
        'T' +
        pad(date.getHours(), 2) +
        ':' +
        pad(date.getMinutes(), 2) +
        ':' +
        pad(date.getSeconds(), 2) +
        '.' +
        pad(date.getMilliseconds(), 3);

    if (offset < 0) {
        res += '-';
        offset *= -1;
    } else {
        res += '+';
    }

    res += pad(Math.floor(offset / 60), 2) + ':' + pad(offset % 60, 2);
    if (isBCYear) res += ' BC';
    return res;
}
