import {
    AppRolePolicies,
    AuthToken,
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    DocumentSearch,
    Id,
    Project,
    ProjectInput,
    ProjectMember,
    ProjectMemberInput,
    User,
    UserInput,
} from '@engspace/core';
import {
    Db,
    DocumentDao,
    DocumentRevisionDao,
    MemberDao,
    ProjectDao,
    UserDao,
} from '@engspace/server-db';
import { ForbiddenError } from 'apollo-server-koa';

export interface ApiContext {
    db: Db;
    auth: AuthToken;
    rolePolicies: AppRolePolicies;
    storePath: string;
}

function hasUserPerm(ctx: ApiContext, perm: string): boolean {
    return ctx.auth.userPerms.includes(perm);
}

function assertUserPerm(ctx: ApiContext, perm: string, message?: string): void {
    if (!hasUserPerm(ctx, perm)) {
        throw new ForbiddenError(message ? message : `Missing permission: '${perm}'`);
    }
}

async function hasProjectPerm(ctx: ApiContext, projectId: Id, perm: string): Promise<boolean> {
    const member = await MemberDao.byProjectAndUserId(ctx.db, projectId, ctx.auth.userId, true);
    console.log(member.roles);
    console.log(ctx.rolePolicies.project.permissions(member.roles));
    return member && ctx.rolePolicies.project.permissions(member.roles).includes(perm);
}

async function assertUserOrProjectPerm(
    ctx: ApiContext,
    projectId: Id,
    perm: string,
    message?: string
): Promise<void> {
    if (hasUserPerm(ctx, perm)) {
        return;
    }
    const has = await hasProjectPerm(ctx, projectId, perm);
    if (!has) {
        throw new ForbiddenError(message ? message : `Missing permission: '${perm}'`);
    }
}

export interface Pagination {
    offset: number;
    limit: number;
}

export class UserControl {
    static async create(ctx: ApiContext, user: UserInput): Promise<User> {
        assertUserPerm(ctx, 'user.create');
        return UserDao.create(ctx.db, user);
    }

    static async byIds(ctx: ApiContext, ids: readonly Id[]): Promise<User[]> {
        assertUserPerm(ctx, 'user.read');
        return UserDao.batchByIds(ctx.db, ids);
    }

    static async byName(ctx: ApiContext, name: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        return UserDao.byName(ctx.db, name);
    }

    static async byEmail(ctx: ApiContext, email: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        return UserDao.byEmail(ctx.db, email);
    }

    static async rolesById(ctx: ApiContext, userId: Id): Promise<string[]> {
        assertUserPerm(ctx, 'user.read');
        return UserDao.rolesById(ctx.db, userId);
    }

    static async search(
        ctx: ApiContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; users: User[] }> {
        assertUserPerm(ctx, 'user.read');
        const { offset, limit } = pag;
        return UserDao.search(ctx.db, {
            phrase: search,
            offset,
            limit,
        });
    }

    static async update(ctx: ApiContext, userId: Id, user: UserInput): Promise<User> {
        if (userId !== ctx.auth.userId) {
            assertUserPerm(ctx, 'user.update');
        }
        return UserDao.update(ctx.db, userId, user);
    }
}

export class ProjectControl {
    static create(ctx: ApiContext, project: ProjectInput): Promise<Project> {
        assertUserPerm(ctx, 'project.create');
        return ProjectDao.create(ctx.db, project);
    }

    static byIds(ctx: ApiContext, ids: readonly Id[]): Promise<Project[]> {
        assertUserPerm(ctx, 'project.read');
        return ProjectDao.batchByIds(ctx.db, ids);
    }

    static async byCode(ctx: ApiContext, code: string): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        return ProjectDao.byCode(ctx.db, code);
    }

    static async search(
        ctx: ApiContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; projects: Project[] }> {
        assertUserPerm(ctx, 'project.read');
        const { offset, limit } = pag;
        return ProjectDao.search(ctx.db, {
            phrase: search,
            offset,
            limit,
        });
    }

    static async update(ctx: ApiContext, id: Id, project: ProjectInput): Promise<Project> {
        await assertUserOrProjectPerm(ctx, id, 'project.update');
        return ProjectDao.updateById(ctx.db, id, project);
    }
}

export class MemberControl {
    static async create(
        ctx: ApiContext,
        projectMember: ProjectMemberInput
    ): Promise<ProjectMember> {
        await assertUserOrProjectPerm(ctx, projectMember.projectId, 'member.create');
        return MemberDao.create(ctx.db, projectMember);
    }

    static async byId(ctx: ApiContext, id: Id): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        return MemberDao.byId(ctx.db, id);
    }

    static async byProjectAndUserId(
        ctx: ApiContext,
        projectId: Id,
        userId: Id
    ): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        return MemberDao.byProjectAndUserId(ctx.db, projectId, userId);
    }

    static async byProjectId(ctx: ApiContext, projId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        return MemberDao.byProjectId(ctx.db, projId);
    }

    static async byUserId(ctx: ApiContext, userId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        return MemberDao.byUserId(ctx.db, userId);
    }

    static async rolesById(ctx: ApiContext, id: Id): Promise<string[]> {
        assertUserPerm(ctx, 'member.read');
        return MemberDao.rolesById(ctx.db, id);
    }

    static async updateRolesById(ctx: ApiContext, id: Id, roles: string[]): Promise<ProjectMember> {
        const mem = await MemberDao.byId(ctx.db, id);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.update');
        return MemberDao.updateRolesById(ctx.db, id, roles);
    }

    static async deleteById(ctx: ApiContext, id: Id): Promise<void> {
        const mem = await MemberDao.byId(ctx.db, id);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.delete');
        return MemberDao.deleteById(ctx.db, id);
    }
}

export class DocumentControl {
    static async create(ctx: ApiContext, document: DocumentInput): Promise<Document> {
        assertUserPerm(ctx, 'document.create');
        return DocumentDao.create(ctx.db, document, ctx.auth.userId);
    }

    static async byId(ctx: ApiContext, id: Id): Promise<Document | null> {
        assertUserPerm(ctx, 'document.read');
        return DocumentDao.byId(ctx.db, id);
    }

    static async search(
        ctx: ApiContext,
        search: string,
        offset: number,
        limit: number
    ): Promise<DocumentSearch> {
        assertUserPerm(ctx, 'document.read');
        return DocumentDao.search(ctx.db, search, offset, limit);
    }

    static async checkout(ctx: ApiContext, id: Id): Promise<Document | null> {
        assertUserPerm(ctx, 'document.revise');
        return DocumentDao.checkout(ctx.db, id, ctx.auth.userId);
    }

    static async discardCheckout(ctx: ApiContext, id: Id): Promise<Document | null> {
        assertUserPerm(ctx, 'document.revise');
        return DocumentDao.discardCheckout(ctx.db, id, ctx.auth.userId);
    }
}

export interface FileDownload {
    docRev: DocumentRevision;
    filepath: string;
}

export enum FileError {
    Forbidden,
    NotExist,
}

export function isFileError(obj: FileDownload | FileError): obj is FileError {
    return (obj as FileDownload).docRev === undefined;
}

export class DocumentRevisionControl {
    static async create(ctx: ApiContext, docRev: DocumentRevisionInput): Promise<DocumentRevision> {
        assertUserPerm(ctx, 'document.revise');
        return DocumentRevisionDao.create(ctx.db, docRev, ctx.auth.userId);
    }

    static async byId(ctx: ApiContext, id: Id): Promise<DocumentRevision | null> {
        assertUserPerm(ctx, 'document.read');
        return DocumentRevisionDao.byId(ctx.db, id);
    }

    static async byDocumentId(ctx: ApiContext, documentId: Id): Promise<DocumentRevision[]> {
        assertUserPerm(ctx, 'document.read');
        return DocumentRevisionDao.byDocumentId(ctx.db, documentId);
    }

    static async lastByDocumentId(
        ctx: ApiContext,
        documentId: Id
    ): Promise<DocumentRevision | null> {
        assertUserPerm(ctx, 'document.read');
        return DocumentRevisionDao.lastByDocumentId(ctx.db, documentId);
    }

    static async download(
        ctx,
        documentId: Id,
        revision: number
    ): Promise<FileDownload | FileError> {
        if (!hasUserPerm(ctx, 'document.read')) {
            return FileError.Forbidden;
        }
        const docRev = await DocumentRevisionDao.byDocumentIdAndRev(ctx.db, documentId, revision);
        if (!docRev) return FileError.NotExist;
        return {
            docRev,
            filepath: docRev.sha1,
        };
    }
}
