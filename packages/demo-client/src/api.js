import axios from 'axios';
import { token as authToken } from './auth';

export const host = process.env.VUE_APP_API_HOST || window.location.hostname;
export const port = process.env.VUE_APP_API_PORT || '3000';

/**
 * Computes Url for an API resource
 *
 * resource should be empty or start with '/'.
 * resource must be already URL encoded
 *
 * @param resource path to an API resource (should be empty or start with '/')
 */
export function url(resource = '') {
    const portPart = port === '80' ? '' : `:${port}`;
    return `http://${host}${portPart}${resource}`;
}

export function authHeader() {
    const token = authToken();
    if (!token) {
        throw new Error('Unauthenticated API call');
    }
    return { Authorization: `Bearer ${token}` };
}

export function buildQuery(obj) {
    const str = [];
    Object.entries(obj).forEach((prop) => {
        if (prop[1]) {
            str.push(`${encodeURIComponent(prop[0])}=${encodeURIComponent(prop[1])}`);
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
    baseURL: url(),
    validateStatus: function (status) {
        return status >= 200 && status < 500;
    },
});
