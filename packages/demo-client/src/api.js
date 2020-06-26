import axios from 'axios';
import { useAuth } from './auth';

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

export function authHeader() {
    const { token } = useAuth();
    return { Authorization: `Bearer ${token.value}` };
}

export function buildQuery(obj) {
    const str = [];
    Object.entries(obj).forEach((prop) => {
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

export function query(path, obj) {
    return `${path}${buildQuery(obj)}`;
}

export const api = axios.create({
    baseURL: apiUrl(),
    validateStatus: function (status) {
        return status >= 200 && status < 500;
    },
});
