import {
    AuthToken,
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    DocumentSearch,
    Id,
    Part,
    PartBase,
    PartFamily,
    PartRevision,
    Project,
    ProjectInput,
    ProjectMember,
    ProjectMemberInput,
    Specification,
    SpecRevision,
    User,
    UserInput,
} from '@engspace/core';
import {
    Db,
    documentDao,
    documentRevisionDao,
    memberDao,
    partBaseDao,
    partDao,
    partFamilyDao,
    partRevisionDao,
    projectDao,
    specificationDao,
    specRevisionDao,
    userDao,
} from '@engspace/server-db';
import { ForbiddenError, UserInputError } from 'apollo-server-koa';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import stream from 'stream';
import util from 'util';
import { EsServerConfig } from '.';

export interface ApiContext {
    db: Db;
    auth: AuthToken;
    config: EsServerConfig;
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
    const { rolePolicies } = ctx.config;
    const member = await memberDao.byProjectAndUserId(ctx.db, projectId, ctx.auth.userId, true);
    return member && rolePolicies.project.permissions(member.roles).includes(perm);
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
        return userDao.create(ctx.db, user);
    }

    static async byIds(ctx: ApiContext, ids: readonly Id[]): Promise<User[]> {
        assertUserPerm(ctx, 'user.read');
        return userDao.batchByIds(ctx.db, ids);
    }

    static async byName(ctx: ApiContext, name: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        return userDao.byName(ctx.db, name);
    }

    static async byEmail(ctx: ApiContext, email: string): Promise<User> {
        assertUserPerm(ctx, 'user.read');
        return userDao.byEmail(ctx.db, email);
    }

    static async rolesById(ctx: ApiContext, userId: Id): Promise<string[]> {
        assertUserPerm(ctx, 'user.read');
        return userDao.rolesById(ctx.db, userId);
    }

    static async search(
        ctx: ApiContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; users: User[] }> {
        assertUserPerm(ctx, 'user.read');
        const { offset, limit } = pag;
        return userDao.search(ctx.db, {
            phrase: search,
            offset,
            limit,
        });
    }

    static async update(ctx: ApiContext, userId: Id, user: UserInput): Promise<User> {
        if (userId !== ctx.auth.userId) {
            assertUserPerm(ctx, 'user.update');
        }
        return userDao.update(ctx.db, userId, user);
    }
}

export class ProjectControl {
    static create(ctx: ApiContext, project: ProjectInput): Promise<Project> {
        assertUserPerm(ctx, 'project.create');
        return projectDao.create(ctx.db, project);
    }

    static byId(ctx: ApiContext, id: Id): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        return projectDao.byId(ctx.db, id);
    }

    static byIds(ctx: ApiContext, ids: readonly Id[]): Promise<Project[]> {
        assertUserPerm(ctx, 'project.read');
        return projectDao.batchByIds(ctx.db, ids);
    }

    static async byCode(ctx: ApiContext, code: string): Promise<Project> {
        assertUserPerm(ctx, 'project.read');
        return projectDao.byCode(ctx.db, code);
    }

    static async search(
        ctx: ApiContext,
        search: string,
        pag?: Pagination
    ): Promise<{ count: number; projects: Project[] }> {
        assertUserPerm(ctx, 'project.read');
        const { offset, limit } = pag;
        return projectDao.search(ctx.db, {
            phrase: search,
            offset,
            limit,
        });
    }

    static async update(ctx: ApiContext, id: Id, project: ProjectInput): Promise<Project> {
        await assertUserOrProjectPerm(ctx, id, 'project.update');
        return projectDao.updateById(ctx.db, id, project);
    }
}

export class MemberControl {
    static async create(
        ctx: ApiContext,
        projectMember: ProjectMemberInput
    ): Promise<ProjectMember> {
        await assertUserOrProjectPerm(ctx, projectMember.projectId, 'member.create');
        return memberDao.create(ctx.db, projectMember);
    }

    static async byId(ctx: ApiContext, id: Id): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        return memberDao.byId(ctx.db, id);
    }

    static async byProjectAndUserId(
        ctx: ApiContext,
        projectId: Id,
        userId: Id
    ): Promise<ProjectMember | null> {
        assertUserPerm(ctx, 'member.read');
        return memberDao.byProjectAndUserId(ctx.db, projectId, userId);
    }

    static async byProjectId(ctx: ApiContext, projId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        return memberDao.byProjectId(ctx.db, projId);
    }

    static async byUserId(ctx: ApiContext, userId: Id): Promise<ProjectMember[]> {
        assertUserPerm(ctx, 'member.read');
        return memberDao.byUserId(ctx.db, userId);
    }

    static async rolesById(ctx: ApiContext, id: Id): Promise<string[]> {
        assertUserPerm(ctx, 'member.read');
        return memberDao.rolesById(ctx.db, id);
    }

    static async updateRolesById(ctx: ApiContext, id: Id, roles: string[]): Promise<ProjectMember> {
        const mem = await memberDao.byId(ctx.db, id);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.update');
        return memberDao.updateRolesById(ctx.db, id, roles);
    }

    static async deleteById(ctx: ApiContext, id: Id): Promise<ProjectMember> {
        const mem = await memberDao.byId(ctx.db, id);
        await assertUserOrProjectPerm(ctx, mem.project.id, 'member.delete');
        return memberDao.deleteById(ctx.db, id);
    }
}

export class DocumentControl {
    static async create(ctx: ApiContext, document: DocumentInput): Promise<Document> {
        assertUserPerm(ctx, 'document.create');
        return documentDao.create(ctx.db, document, ctx.auth.userId);
    }

    static async byId(ctx: ApiContext, id: Id): Promise<Document | null> {
        assertUserPerm(ctx, 'document.read');
        return documentDao.byId(ctx.db, id);
    }

    static async search(
        ctx: ApiContext,
        search: string,
        offset: number,
        limit: number
    ): Promise<DocumentSearch> {
        assertUserPerm(ctx, 'document.read');
        return documentDao.search(ctx.db, search, offset, limit);
    }

    static async checkout(ctx: ApiContext, id: Id, revision: number): Promise<Document> {
        assertUserPerm(ctx, 'document.revise');
        const lastRev = await documentRevisionDao.lastByDocumentId(ctx.db, id);
        if (!lastRev) {
            if (revision !== 0) {
                throw new UserInputError(`${revision} is not the last revision`);
            }
        } else if (revision !== lastRev.revision) {
            throw new UserInputError(`${revision} is not the last revision`);
        }
        const doc = await documentDao.checkout(ctx.db, id, ctx.auth.userId);
        if (!doc) {
            throw new UserInputError('Could not checkout the specified document');
        }
        if (doc.checkout.id !== ctx.auth.userId) {
            const user = await userDao.byId(ctx.db, doc.checkout.id);
            throw new UserInputError(`Document is already checked out by ${user.fullName}`);
        }
        return doc;
    }

    static async discardCheckout(ctx: ApiContext, id: Id): Promise<Document | null> {
        assertUserPerm(ctx, 'document.revise');
        const doc = await documentDao.discardCheckout(ctx.db, id, ctx.auth.userId);
        if (!doc) return null;
        if (doc.checkout) {
            if (doc.checkout.id === ctx.auth.userId) {
                throw new Error(`Could not discard checkout of "${doc.name}"`);
            }
            const user = await userDao.byId(ctx.db, doc.checkout.id);
            throw new UserInputError(`Document is checked-out by ${user.fullName}`);
        }
        return doc;
    }
}

namespace fsp {
    export const pipeline = util.promisify(stream.pipeline);
    export const mkdir = util.promisify(fs.mkdir);
    export const open = util.promisify(fs.open);
    export const close = util.promisify(fs.close);
    export const rename = util.promisify(fs.rename);
}

export namespace DocumentRevisionControl {
    export async function create(
        ctx: ApiContext,
        docRev: DocumentRevisionInput
    ): Promise<DocumentRevision> {
        assertUserPerm(ctx, 'document.revise');
        return documentRevisionDao.create(ctx.db, docRev, ctx.auth.userId);
    }

    export async function byId(ctx: ApiContext, id: Id): Promise<DocumentRevision | null> {
        assertUserPerm(ctx, 'document.read');
        return documentRevisionDao.byId(ctx.db, id);
    }

    export async function byDocumentId(
        ctx: ApiContext,
        documentId: Id
    ): Promise<DocumentRevision[]> {
        assertUserPerm(ctx, 'document.read');
        return documentRevisionDao.byDocumentId(ctx.db, documentId);
    }

    export async function byDocumentIdAndRevision(
        ctx: ApiContext,
        documentId: Id,
        revision: number
    ): Promise<DocumentRevision> {
        assertUserPerm(ctx, 'document.read');
        return documentRevisionDao.byDocumentIdAndRev(ctx.db, documentId, revision);
    }

    export async function lastByDocumentId(
        ctx: ApiContext,
        documentId: Id
    ): Promise<DocumentRevision | null> {
        assertUserPerm(ctx, 'document.read');
        return documentRevisionDao.lastByDocumentId(ctx.db, documentId);
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

    export interface UploadChunk {
        length: number;
        offset: number;
        totalLength: number;
        data: stream.Readable;
    }

    interface OpenUpload {
        fd: number;
        path: string;
        touched: number;
    }

    const openUploadMaxAge = 5000;
    const openUploads: { [id: string]: OpenUpload } = {};

    function checkCleanup(revId: Id): void {
        const upload = openUploads[revId];
        if (!upload) return;
        if (Date.now() - upload.touched >= openUploadMaxAge) {
            delete openUploads[revId];
            console.log('closing file');
            fsp.close(upload.fd);
        }
    }

    export async function download(
        ctx: ApiContext,
        documentId: Id,
        revision: number
    ): Promise<FileDownload | FileError> {
        if (!hasUserPerm(ctx, 'document.read')) {
            return FileError.Forbidden;
        }
        const docRev = await documentRevisionDao.byDocumentIdAndRev(ctx.db, documentId, revision);
        if (!docRev) return FileError.NotExist;
        return {
            docRev,
            filepath: path.join(ctx.config.storePath, docRev.sha1),
        };
    }

    export async function uploadChunk(
        ctx: ApiContext,
        revisionId: Id,
        chunk: UploadChunk
    ): Promise<void> {
        assertUserPerm(ctx, 'document.revise');

        const tempDir = path.join(ctx.config.storePath, 'upload');
        await fsp.mkdir(tempDir, { recursive: true });
        const openFlags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL;
        const tempPath = path.join(tempDir, revisionId);

        if (chunk.offset === 0 && chunk.length === chunk.totalLength) {
            // upload is made of a single chunk
            const ws = fs.createWriteStream(tempPath, {
                flags: (openFlags as unknown) as string,
                encoding: 'binary',
            });
            await fsp.pipeline(chunk.data, ws);
        } else {
            if (!openUploads[revisionId]) {
                const fd = await fsp.open(tempPath, openFlags);
                openUploads[revisionId] = {
                    fd,
                    path: tempPath,
                    touched: 0,
                };
            }
            const upload = openUploads[revisionId];
            const ws = fs.createWriteStream('', {
                fd: upload.fd,
                start: chunk.offset,
                encoding: 'binary',
                autoClose: false,
            });
            await fsp.pipeline(chunk.data, ws);
            upload.touched = Date.now();
            setTimeout(checkCleanup, openUploadMaxAge + 10, revisionId);
        }
        await documentRevisionDao.updateAddProgress(ctx.db, revisionId, chunk.length);
    }

    async function sha1sum(filepath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const rs = fs.createReadStream(filepath);
            const hasher = crypto.createHash('sha1');
            rs.on('data', function(data) {
                hasher.update(data);
            });
            rs.on('end', function() {
                return resolve(hasher.digest('hex'));
            });
            rs.on('error', function(err) {
                reject(err);
            });
        });
    }

    export async function finalizeUpload(
        ctx: ApiContext,
        revisionId: Id,
        clientSha1: string
    ): Promise<DocumentRevision> {
        assertUserPerm(ctx, 'document.revise');

        const sha1 = clientSha1.toLowerCase();

        const tempDir = path.join(ctx.config.storePath, 'upload');
        const tempPath = path.join(tempDir, revisionId);
        if (openUploads[revisionId]) {
            const upload = openUploads[revisionId];
            if (upload.path !== tempPath) {
                throw new Error('Not matching temporary upload path');
            }
            fsp.close(upload.fd);
            delete openUploads[revisionId];
        }
        const hash = await sha1sum(tempPath);
        if (hash.toLowerCase() !== sha1) {
            throw new Error(
                `Server hash (${hash.toLowerCase()}) do not match client hash (${sha1})`
            );
        }
        await fsp.mkdir(ctx.config.storePath, { recursive: true });
        const finalPath = path.join(ctx.config.storePath, sha1);
        await fsp.rename(tempPath, finalPath);
        return documentRevisionDao.updateSha1(ctx.db, revisionId, sha1);
    }
}

export namespace PartFamilyControl {
    export async function byId(ctx: ApiContext, id: Id): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.read');
        return partFamilyDao.byId(ctx.db, id);
    }
}

export namespace PartBaseControl {
    export async function byId(ctx: ApiContext, id: Id): Promise<PartBase> {
        assertUserPerm(ctx, 'part.read');
        return partBaseDao.byId(ctx.db, id);
    }
}

export namespace PartControl {
    export async function byId(ctx: ApiContext, id: Id): Promise<Part> {
        assertUserPerm(ctx, 'part.read');
        return partDao.byId(ctx.db, id);
    }
}

export namespace PartRevisionControl {
    export async function byId(ctx: ApiContext, id: Id): Promise<PartRevision> {
        assertUserPerm(ctx, 'part.read');
        return partRevisionDao.byId(ctx.db, id);
    }
}

export namespace SpecificationControl {
    export async function byId(ctx: ApiContext, id: Id): Promise<Specification> {
        assertUserPerm(ctx, 'spec.read');
        return specificationDao.byId(ctx.db, id);
    }
    export async function byPartId(ctx: ApiContext, partId: Id): Promise<Specification[]> {
        assertUserPerm(ctx, 'spec.read');
        return specificationDao.byPartId(ctx.db, partId);
    }
}

export namespace SpecRevisionControl {
    export async function byId(ctx: ApiContext, id: Id): Promise<SpecRevision> {
        assertUserPerm(ctx, 'spec.read');
        return specRevisionDao.byId(ctx.db, id);
    }
    export async function byPartRevId(ctx: ApiContext, partRevId: Id): Promise<SpecRevision[]> {
        assertUserPerm(ctx, 'spec.read');
        return specRevisionDao.byPartRevId(ctx.db, partRevId);
    }
}
