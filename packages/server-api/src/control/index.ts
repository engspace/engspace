import { AuthToken } from '@engspace/core';
import { Db, DaoSet } from '@engspace/server-db';
import { EsServerConfig } from '..';
import { DocumentControl, DocumentRevisionControl } from './document';
import { PartControl } from './part';
import { PartFamilyControl } from './part-family';
import { ProjectControl } from './project';
import { UserControl } from './user';

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
    document: DocumentControl;
    documentRevision: DocumentRevisionControl;
}

export function buildControllerSet(
    dao: DaoSet,
    custom: Partial<ControllerSet> = {}
): ControllerSet {
    return {
        user: custom.user ?? new UserControl(dao),
        project: custom.project ?? new ProjectControl(dao),
        partFamily: custom.partFamily ?? new PartFamilyControl(dao),
        part: custom.part ?? new PartControl(dao),
        document: custom.document ?? new DocumentControl(dao),
        documentRevision: custom.documentRevision ?? new DocumentRevisionControl(dao),
    };
}
