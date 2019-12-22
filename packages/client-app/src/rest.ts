import axios from 'axios';
import store from './store';

const host = process.env.VUE_APP_API_HOST || window.location.hostname;
const port = process.env.VUE_APP_API_PORT || 3000;

export function authHeader(): { Authorization: string } {
    return { Authorization: `Bearer ${store.state.token}` };
}

export function buildQuery(obj: any): string {
    const str: string[] = [];
    Object.entries(obj).forEach((prop: [string, any]) => {
        if (prop[1]) {
            str.push(`${encodeURIComponent(prop[0])}=${encodeURIComponent(prop[1])}`);
        }
    });
    if (str.length) {
        return `?${str.join('&')}`;
    }
    return '';
}

export function query(path: string, obj: any): string {
    return `${path}${buildQuery(obj)}`;
}

export const rest = axios.create({
    baseURL: `http://${host}:${port}`,
    validateStatus: function(status) {
        console.log('validating status: ' + status);
        return status >= 200 && status < 500;
    },
});
