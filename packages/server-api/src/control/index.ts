import { AuthToken } from '@engspace/core';
import { Db, DaoSet } from '@engspace/server-db';
import { EsServerConfig } from '..';
import { DocumentControl, DocumentRevisionControl } from './document';
import { PartControl } from './part';
import { PartFamilyControl } from './part-family';
import { ProjectControl } from './project';
import { UserControl } from './user';
import { ChangeControl } from './change';

export interface ApiContext {
    db: Db;
    auth: AuthToken;
    config: EsServerConfig;
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

export function buildControllerSet(
    dao: DaoSet,
    custom: Partial<ControllerSet> = {}
): ControllerSet {
    const user = custom.user ?? new UserControl(dao);
    const project = custom.project ?? new ProjectControl(dao);
    const partFamily = custom.partFamily ?? new PartFamilyControl(dao);
    const part = custom.part ?? new PartControl(dao);
    const change = custom.change ?? new ChangeControl(dao, part);
    const document = custom.document ?? new DocumentControl(dao);
    const documentRevision = custom.documentRevision ?? new DocumentRevisionControl(dao);
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
