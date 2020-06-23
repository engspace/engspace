import axios from 'axios';
import store from './store';

export const apiHost = process.env.VUE_APP_API_HOST || window.location.hostname;
export const apiPort = process.env.VUE_APP_API_PORT || '3000';

/**
 * Computes Url for an API resource
 *
 * resource should be empty or start with '/'.
 * resource must be already URL encoded
 *
 * @param resource path to an API resource (should be empty or start with '/')
 */
export function apiUrl(resource = '') {
    const port = apiPort === '80' ? '' : `:${apiPort}`;
    return `http://${apiHost}${port}${resource}`;
}

export function authHeader(): { Authorization: string } {
    return { Authorization: `Bearer ${store.state.token}` };
}

export function buildQuery(obj: any): string {
    const str: string[] = [];
    Object.entries(obj).forEach((prop: [string, any]) => {
        if (prop[1]) {
            str.push(
                `${encodeURIComponent(prop[0])}=${encodeURIComponent(prop[1])}`
            );
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

export const api = axios.create({
    baseURL: apiUrl(),
    validateStatus: function (status: number) {
        return status >= 200 && status < 500;
    },
});
