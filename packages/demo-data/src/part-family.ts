import { PartFamilyInput, PartFamily } from '@engspace/core';
import { Db, partFamilyDao } from '@engspace/server-db';

interface DemoPartFamilyInputSet {
    [name: string]: PartFamilyInput;
}

interface DemoPartFamilySet {
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

export async function createPartFamilies(
    db: Db,
    input: DemoPartFamilyInputSet
): Promise<DemoPartFamilySet> {
    const keyVals = await Promise.all(
        Object.entries(input).map(async ([name, input]) => [
            name,
            await partFamilyDao.create(db, input),
        ])
    );
    return Object.fromEntries(keyVals);
}
