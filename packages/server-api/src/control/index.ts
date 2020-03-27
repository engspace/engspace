import { AuthToken } from '@engspace/core';
import { Db } from '@engspace/server-db';
import { EsServerConfig } from '..';
import { DocumentControl, DocumentRevisionControl } from './document';
import { PartBaseControl, PartControl, PartControl2 } from './part';
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
    part2: PartControl2;
    partBase: PartBaseControl;
    part: PartControl;
    document: DocumentControl;
    documentRevision: DocumentRevisionControl;
}

export function buildControllerSet(custom: Partial<ControllerSet> = {}): ControllerSet {
    return {
        user: custom.user ?? new UserControl(),
        project: custom.project ?? new ProjectControl(),
        partFamily: custom.partFamily ?? new PartFamilyControl(),
        part2: custom.part2 ?? new PartControl2(),
        partBase: custom.partBase ?? new PartBaseControl(),
        part: custom.part ?? new PartControl(),
        document: custom.document ?? new DocumentControl(),
        documentRevision: custom.documentRevision ?? new DocumentRevisionControl(),
    };
}
