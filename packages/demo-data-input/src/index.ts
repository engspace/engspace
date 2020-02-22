export { DemoDocInput, prepareRevision, prepareStore, documentInput } from './document';
export { membersInput } from './member';
export { DemoPartFamilyInputSet, DemoPartFamilySet, partFamiliesInput } from './part-family';
export { DemoProjectInputSet, DemoProjectSet, prepareProjects } from './project';
export { DemoUserInputSet, DemoUserSet, prepareUsers } from './user';

export async function asyncKeyMap<InT, OutT>(
    input: { [prop: string]: InT },
    func: (inp: InT) => Promise<OutT>
): Promise<{ [prop: string]: OutT }> {
    const keyVals = await Promise.all(
        Object.entries(input).map(async ([key, inp]) => [key, await func(inp)])
    );
    return Object.fromEntries(keyVals);
}
