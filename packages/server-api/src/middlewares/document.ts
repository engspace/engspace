import crypto from 'crypto';
import fs from 'fs';
import HttpStatus from 'http-status-codes';
import mime from 'mime';
import validator from 'validator';
import { Id } from '@engspace/core';
import { EsServerConfig } from '..';
import { isFileError, FileError, FileDownload } from '../control/document';
import { signJwt, verifyJwt } from '../crypto';
import { EsKoaMiddleware } from '../es-koa';

const docJwtSecret = crypto.randomBytes(32).toString('base64');

interface DownloadToken {
    documentRevisionId: Id;
    userId: Id;
}

interface DocumentMiddlewares {
    upload: EsKoaMiddleware;
    downloadToken: EsKoaMiddleware;
    download: EsKoaMiddleware;
}

export function documentMiddlewares(config: EsServerConfig): DocumentMiddlewares {
    const { pool, rolePolicies, control, dao } = config;
    return {
        upload: async (ctx) => {
            const { rev_id: revId } = ctx.request.query;
            const {
                'content-length': length,
                'x-upload-offset': offset,
                'x-upload-length': totalLength,
            } = ctx.request.headers;
            const auth = ctx.state.authToken;
            if (!auth || !auth.userPerms.includes('document.revise')) {
                ctx.throw(HttpStatus.FORBIDDEN, 'Missing permission: "document.revise"');
            }
            if (!revId) {
                ctx.throw(HttpStatus.BAD_REQUEST, 'Missing "rev_id" query');
            }
            if (length === undefined) {
                ctx.throw(HttpStatus.BAD_REQUEST, 'Missing "Content-Length" header');
            }
            if (offset === undefined) {
                ctx.throw(HttpStatus.BAD_REQUEST, 'Missing "X-Upload-Offset" header');
            }
            if (totalLength === undefined) {
                ctx.throw(HttpStatus.BAD_REQUEST, 'Missing "X-Upload-Length" header');
            }
            await pool.connect(async (db) => {
                ctx.assert(
                    await dao.documentRevision.checkId(db, revId),
                    HttpStatus.NOT_FOUND,
                    'Revision not found'
                );
                return control.documentRevision.uploadChunk(
                    {
                        db,
                        auth: ctx.state.authToken,
                        config,
                    },
                    revId,
                    {
                        length: parseInt(length, 10),
                        offset: parseInt(offset, 10),
                        totalLength: parseInt(totalLength, 10),
                        data: ctx.req,
                    }
                );
            });
            ctx.status = HttpStatus.OK;
        },

        downloadToken: async (ctx) => {
            const { documentId, revision } = ctx.request.query;
            const auth = ctx.state.authToken;
            if (!auth.userPerms.includes('document.read')) {
                ctx.throw(HttpStatus.FORBIDDEN, 'missing permission: "document.read"');
            }
            if (!validator.isInt(documentId) || !validator.isInt(revision)) {
                ctx.throw(HttpStatus.BAD_REQUEST, 'wrong document or revision');
            }
            const documentRevisionId = await pool.connect(async (db) => {
                return dao.documentRevision.idByDocumentIdAndRev(
                    db,
                    documentId,
                    parseInt(revision)
                );
            });
            if (!documentRevisionId) {
                ctx.throw(HttpStatus.NOT_FOUND, 'wrong document or revision number');
            }
            const downloadToken = await signJwt(
                { documentRevisionId, userId: auth.userId },
                docJwtSecret,
                {
                    expiresIn: '5s',
                }
            );
            ctx.response.body = { downloadToken };
        },

        download: async (ctx) => {
            const { token } = ctx.request.query;
            let downloadToken: DownloadToken;
            try {
                downloadToken = await verifyJwt(token, docJwtSecret);
            } catch (err) {
                ctx.throw(HttpStatus.BAD_REQUEST, err.message);
            }

            const { documentRevisionId, userId } = downloadToken;
            if (!documentRevisionId || !userId) {
                ctx.throw(HttpStatus.BAD_REQUEST);
            }
            const fd = await pool.connect(async (db) => {
                const roles = await dao.user.rolesById(db, userId);
                const auth = {
                    userId,
                    userPerms: rolePolicies.user.permissions(roles),
                };
                const res = await control.documentRevision.download(
                    {
                        db,
                        auth,
                        config,
                    },
                    documentRevisionId
                );
                if (isFileError(res)) {
                    if (res === FileError.NotExist) {
                        ctx.throw(HttpStatus.NOT_FOUND);
                    } else if (res == FileError.Forbidden) {
                        ctx.throw(HttpStatus.FORBIDDEN);
                    }
                }
                return res as FileDownload;
            });
            const stream = fs.createReadStream(fd.filepath);
            ctx.set('Content-Disposition', `attachment; filename=${fd.docRev.filename}`);
            ctx.set('Content-Type', mime.getType(fd.docRev.filename));
            ctx.response.length = fd.docRev.filesize;
            ctx.response.body = stream;
        },
    };
}
