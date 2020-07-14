import { DocumentNode } from 'graphql';

export function operationName(doc: DocumentNode): string | undefined {
    const def0 = doc.definitions[0];
    if (def0 && def0.kind === 'OperationDefinition') {
        return def0.name?.value;
    }
}
