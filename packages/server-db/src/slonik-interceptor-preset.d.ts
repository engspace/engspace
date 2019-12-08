declare module 'slonik-interceptor-preset' {
    import { InterceptorType } from 'slonik';

    export interface UserConfigurationType {
        benchmarkQueries: boolean;
        logQueries: boolean;
        normaliseQueries: boolean;
        transformFieldNames: boolean;
    }

    export function createInterceptors(
        userConfiguration?: Partial<UserConfigurationType>
    ): InterceptorType[];
}
