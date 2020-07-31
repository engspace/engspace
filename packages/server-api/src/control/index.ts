import { AuthToken, EsRolePolicies } from '@engspace/core';
import { Db, EsDaoSet } from '@engspace/server-db';
import { EsServerConfig, EsServerRuntime } from '..';
import { ChangeControl } from './change';
import { DocumentControl, DocumentRevisionControl } from './document';
import { PartControl } from './part';
import { PartFamilyControl } from './part-family';
import { ProjectControl } from './project';
import { UserControl } from './user';

export interface EsContext<
    TokenT extends AuthToken = AuthToken,
    DaoT extends EsDaoSet = EsDaoSet,
    ControlT extends EsControlSet = EsControlSet,
    RolePoliciesT extends EsRolePolicies = EsRolePolicies,
    NamingCtxT = undefined
> {
    db: Db;
    auth: TokenT;
    runtime: EsServerRuntime<DaoT, ControlT>;
    config: EsServerConfig<RolePoliciesT, NamingCtxT>;
}

export interface Pagination {
    offset: number;
    limit: number;
}

export interface EsControlSet {
    user: UserControl;
    project: ProjectControl;
    partFamily: PartFamilyControl;
    part: PartControl;
    change: ChangeControl;
    document: DocumentControl;
    documentRevision: DocumentRevisionControl;
}

export function buildEsControlSet(custom: Partial<EsControlSet> = {}): EsControlSet {
    const user = custom.user ?? new UserControl();
    const project = custom.project ?? new ProjectControl();
    const partFamily = custom.partFamily ?? new PartFamilyControl();
    const part = custom.part ?? new PartControl();
    const change = custom.change ?? new ChangeControl();
    const document = custom.document ?? new DocumentControl();
    const documentRevision = custom.documentRevision ?? new DocumentRevisionControl();
    return {
        user,
        project,
        partFamily,
        part,
        change,
        document,
        documentRevision,
    };
}
