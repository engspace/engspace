import { AuthToken, EsRolePolicies } from '@engspace/core';
import { Db, DaoSet } from '@engspace/server-db';
import { EsServerConfig, EsServerRuntime } from '..';
import { ChangeControl } from './change';
import { DocumentControl, DocumentRevisionControl } from './document';
import { PartControl } from './part';
import { PartFamilyControl } from './part-family';
import { ProjectControl } from './project';
import { UserControl } from './user';

export interface ApiContext<
    TokenT extends AuthToken = AuthToken,
    DaoT extends DaoSet = DaoSet,
    ControlT extends ControllerSet = ControllerSet,
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

export interface ControllerSet {
    user: UserControl;
    project: ProjectControl;
    partFamily: PartFamilyControl;
    part: PartControl;
    change: ChangeControl;
    document: DocumentControl;
    documentRevision: DocumentRevisionControl;
}

export function buildControllerSet(custom: Partial<ControllerSet> = {}): ControllerSet {
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
