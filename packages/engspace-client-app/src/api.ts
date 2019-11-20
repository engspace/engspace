import axios from 'axios';

import store from './store';

const host = process.env.VUE_APP_API_HOST || window.location.hostname;
const port = process.env.VUE_APP_API_PORT || 3000;
function resource(path: string): string {
    return `http://${host}:${port}/api${path}`;
}
function authHeader(): any {
    if (store.getters.isAuth) {
        return { headers: { Authorization: `Bearer ${store.state.token}` } };
    }
    return undefined;
}
function authorized(): string {
    return store.getters.isAuth ? 'authorized ' : '';
}

class Api {
    public static buildQuery(obj: any): string {
        const str: string[] = [];
        Object.entries(obj).forEach((prop: [string, any]) => {
            if (prop[1]) {
                str.push(
                    `${encodeURIComponent(prop[0])}=${encodeURIComponent(
                        prop[1]
                    )}`
                );
            }
        });
        if (str.length) {
            return `?${str.join('&')}`;
        }
        return '';
    }

    public static query(path: string, queryObj: any): string {
        return `${path}${Api.buildQuery(queryObj)}`;
    }

    public static async get(path: string): Promise<any> {
        console.log(`sending ${authorized()}GET request: ${path}`);
        return axios.get(resource(path), authHeader());
    }

    public static async post(path: string, payload: any): Promise<any> {
        console.log(`sending ${authorized()}POST request: ${path}`);
        console.log(payload);
        return axios.post(resource(path), payload, authHeader());
    }

    public static async patch(path: string, payload: any): Promise<any> {
        console.log(`sending ${authorized()}PATCH request: ${path}`);
        console.log(payload);
        return axios.patch(resource(path), payload, authHeader());
    }

    public static async put(path: string, payload: any): Promise<any> {
        console.log(`sending ${authorized()}PUT request: ${path}`);
        console.log(payload);
        return axios.put(resource(path), payload, authHeader());
    }
}

export { Api };
