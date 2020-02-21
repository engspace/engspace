import { PartFamilyInput, PartFamily } from '@engspace/core';

export interface DemoPartFamilyInputSet {
    [name: string]: PartFamilyInput;
}

export interface DemoPartFamilySet {
    [name: string]: PartFamily;
}

export const partFamiliesInput: DemoPartFamilyInputSet = {
    rawMaterial: {
        code: '1',
        name: 'Raw material',
    },
    transformed: {
        code: '2',
        name: 'Transformed parts',
    },
    purchased: {
        code: '3',
        name: 'Purchased parts',
    },
    subAssy: {
        code: '4',
        name: 'Sub-assembly',
    },
    topAssy: {
        code: '5',
        name: 'Sub-assembly',
    },
};
