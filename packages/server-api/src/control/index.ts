import { AuthToken } from '@engspace/core';
import { Db } from '@engspace/server-db';
import { EsServerConfig } from '..';
import { DocumentControl, DocumentRevisionControl } from './document';
import { PartBaseControl1, PartControl1, PartControl } from './part';
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
    partBase1: PartBaseControl1;
    part1: PartControl1;
    document: DocumentControl;
    documentRevision: DocumentRevisionControl;
}

export function buildControllerSet(custom: Partial<ControllerSet> = {}): ControllerSet {
    return {
        user: custom.user ?? new UserControl(),
        project: custom.project ?? new ProjectControl(),
        partFamily: custom.partFamily ?? new PartFamilyControl(),
        part: custom.part ?? new PartControl(),
        partBase1: custom.partBase1 ?? new PartBaseControl1(),
        part1: custom.part1 ?? new PartControl1(),
        document: custom.document ?? new DocumentControl(),
        documentRevision: custom.documentRevision ?? new DocumentRevisionControl(),
    };
}
