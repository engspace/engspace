import { InjectionKey, provide, inject } from '@vue/composition-api';
import { AppRolePolicies } from '@engspace/core';

interface EsClientConfig {
    rolePolicies: AppRolePolicies;
}

const ConfigSymbol: InjectionKey<EsClientConfig> = Symbol();

export function provideConfig(config: EsClientConfig) {
    provide(ConfigSymbol, config);
}

export function useConfig(): EsClientConfig {
    const conf = inject(ConfigSymbol);
    if (!conf) {
        throw new Error('useConfig: provideConfig not called!');
    }
    return conf;
}
