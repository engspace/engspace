import fs from 'fs';
import path from 'path';
import stream from 'stream';
import util from 'util';
import { UserInputError } from 'apollo-server-koa';
import {
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    DocumentSearch,
    Id,
} from '@engspace/core';
import { fileSha1sum } from '../util';
import { assertUserPerm, hasUserPerm } from './helpers';
import { ApiContext } from '.';

export class DocumentControl {
    create(ctx: ApiContext, document: DocumentInput): Promise<Document> {
        assertUserPerm(ctx, 'document.create');
        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;
        return dao.document.create(db, document, userId);
    }

    byId(ctx: ApiContext, id: Id): Promise<Document | null> {
        assertUserPerm(ctx, 'document.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.document.byId(db, id);
    }

    search(
        ctx: ApiContext,
        search: string,
        offset: number,
        limit: number
    ): Promise<DocumentSearch> {
        assertUserPerm(ctx, 'document.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.document.search(db, search, offset, limit);
    }

    async checkout(ctx: ApiContext, id: Id, revision: number): Promise<Document> {
        assertUserPerm(ctx, 'document.revise');
        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;
        const lastRev = await dao.documentRevision.lastByDocumentId(db, id);
        if (!lastRev) {
            if (revision !== 0) {
                throw new UserInputError(`${revision} is not the last revision`);
            }
        } else if (revision !== lastRev.revision) {
            throw new UserInputError(`${revision} is not the last revision`);
        }
        const doc = await dao.document.checkout(db, id, userId);
        if (!doc) {
            throw new UserInputError('Could not checkout the specified document');
        }
        if (doc.checkout.id !== userId) {
            const user = await dao.user.byId(db, doc.checkout.id);
            throw new UserInputError(`Document is already checked out by ${user.fullName}`);
        }
        return doc;
    }

    async discardCheckout(ctx: ApiContext, id: Id): Promise<Document | null> {
        assertUserPerm(ctx, 'document.revise');
        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;
        const doc = await dao.document.discardCheckout(db, id, userId);
        if (!doc) return null;
        if (doc.checkout) {
            if (doc.checkout.id === userId) {
                throw new Error(`Could not discard checkout of "${doc.name}"`);
            }
            const user = await dao.user.byId(db, doc.checkout.id);
            throw new UserInputError(`Document is checked-out by ${user.fullName}`);
        }
        return doc;
    }
}

namespace streamp {
    export const pipeline = util.promisify(stream.pipeline);
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
    fh: fs.promises.FileHandle;
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
        upload.fh.close();
    }
}

export class DocumentRevisionControl {
    async create(ctx: ApiContext, docRev: DocumentRevisionInput): Promise<DocumentRevision> {
        assertUserPerm(ctx, 'document.revise');
        const {
            db,
            auth: { userId },
            runtime: { dao },
        } = ctx;
        const checkoutId = await dao.document.checkoutIdById(db, docRev.documentId);
        if (!checkoutId) {
            throw new UserInputError('Trying to revise a non checked-out document');
        }
        if (checkoutId !== userId) {
            const user = await dao.user.byId(db, checkoutId);
            throw new UserInputError(`Document checked-out by ${user.fullName}`);
        }
        return dao.documentRevision.create(db, docRev, userId);
    }

    byId(ctx: ApiContext, id: Id): Promise<DocumentRevision | null> {
        assertUserPerm(ctx, 'document.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.documentRevision.byId(db, id);
    }

    byDocumentId(ctx: ApiContext, documentId: Id): Promise<DocumentRevision[]> {
        assertUserPerm(ctx, 'document.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.documentRevision.byDocumentId(db, documentId);
    }

    lastByDocumentId(ctx: ApiContext, documentId: Id): Promise<DocumentRevision | null> {
        assertUserPerm(ctx, 'document.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.documentRevision.lastByDocumentId(db, documentId);
    }

    async download(ctx: ApiContext, documentRevisionId: Id): Promise<FileDownload | FileError> {
        if (!hasUserPerm(ctx, 'document.read')) {
            return FileError.Forbidden;
        }
        const {
            db,
            runtime: { dao },
            config: { storePath },
        } = ctx;
        const docRev = await dao.documentRevision.byId(db, documentRevisionId);
        if (!docRev) return FileError.NotExist;
        return {
            docRev,
            filepath: path.join(storePath, docRev.sha1),
        };
    }

    async uploadChunk(ctx: ApiContext, revisionId: Id, chunk: UploadChunk): Promise<void> {
        assertUserPerm(ctx, 'document.revise');

        const {
            db,
            runtime: { dao },
            config: { storePath },
        } = ctx;
        const tempDir = path.join(storePath, 'upload');
        await fs.promises.mkdir(tempDir, { recursive: true });
        const openFlags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL;
        const tempPath = path.join(tempDir, revisionId);

        if (chunk.offset === 0 && chunk.length === chunk.totalLength) {
            // upload is made of a single chunk
            const ws = fs.createWriteStream(tempPath, {
                flags: (openFlags as unknown) as string,
                encoding: 'binary',
            });
            await streamp.pipeline(chunk.data, ws);
        } else {
            if (!openUploads[revisionId]) {
                const fh = await fs.promises.open(tempPath, openFlags);
                openUploads[revisionId] = {
                    fh,
                    path: tempPath,
                    touched: 0,
                };
            }
            const upload = openUploads[revisionId];
            const ws = fs.createWriteStream('', {
                fd: upload.fh.fd,
                start: chunk.offset,
                encoding: 'binary',
                autoClose: false,
            });
            await streamp.pipeline(chunk.data, ws);
            upload.touched = Date.now();
            setTimeout(checkCleanup, openUploadMaxAge + 10, revisionId);
        }
        await dao.documentRevision.updateAddProgress(db, revisionId, chunk.length);
    }

    async finalizeUpload(
        ctx: ApiContext,
        revisionId: Id,
        clientSha1: string
    ): Promise<DocumentRevision> {
        assertUserPerm(ctx, 'document.revise');
        const {
            db,
            runtime: { dao },
            config: { storePath },
        } = ctx;

        const sha1 = clientSha1.toLowerCase();

        const tempDir = path.join(storePath, 'upload');
        const tempPath = path.join(tempDir, revisionId);
        if (openUploads[revisionId]) {
            const upload = openUploads[revisionId];
            if (upload.path !== tempPath) {
                throw new Error('Not matching temporary upload path');
            }
            await upload.fh.close();
            delete openUploads[revisionId];
        }
        const hash = await fileSha1sum(tempPath);
        if (hash.toLowerCase() !== sha1) {
            await fs.promises.unlink(tempPath);
            await dao.documentRevision.deleteById(db, revisionId);
            throw new Error(
                `Server hash (${hash.toLowerCase()}) do not match client hash (${sha1}).` +
                    `\nRevision is aborted.`
            );
        }
        await fs.promises.mkdir(storePath, { recursive: true });
        const finalPath = path.join(storePath, sha1);
        await fs.promises.rename(tempPath, finalPath);
        return dao.documentRevision.updateSha1(db, revisionId, sha1);
    }
}
