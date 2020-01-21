import { Id } from '@engspace/core';
import { UserDao } from '@engspace/server-db';
import Router from '@koa/router';
import crypto from 'crypto';
import mime from 'mime';
import fs from 'fs';
import HttpStatus from 'http-status-codes';
import { EsServerConfig } from '..';
import { DocumentRevisionControl } from '../controllers';
import { getAuthToken } from '../internal';
import { signJwt, verifyJwt } from '../crypto';

const docJwtSecret = crypto.randomBytes(32).toString('base64');

interface DownloadToken {
    documentId: Id;
    revision: number;
    userId: Id;
}

export function setupPostAuthDocRoutes(router: Router, config: EsServerConfig): void {
    const { pool } = config;

    router.get('/document/download_token', async ctx => {
        const { documentId, revision } = ctx.request.query;
        const auth = getAuthToken(ctx);
        const downloadToken = await signJwt(
            { documentId, revision, userId: auth.userId },
            docJwtSecret,
            {
                expiresIn: '5s',
            }
        );
        ctx.response.body = { downloadToken };
    });
    router.post('/document/upload', async ctx => {
        const { rev_id: revId } = ctx.request.query;
        const {
            'content-length': length,
            'x-upload-offset': offset,
            'x-upload-length': totalLength,
        } = ctx.request.headers;
        if (length === undefined) {
            ctx.throw(HttpStatus.BAD_REQUEST, 'Missing "Content-Length" header');
        }
        if (offset === undefined) {
            ctx.throw(HttpStatus.BAD_REQUEST, 'Missing "X-Upload-Offset" header');
        }
        if (totalLength === undefined) {
            ctx.throw(HttpStatus.BAD_REQUEST, 'Missing "X-Upload-Length" header');
        }
        await pool.connect(async db =>
            DocumentRevisionControl.uploadChunk(
                {
                    db,
                    auth: getAuthToken(ctx),
                    config,
                },
                revId,
                {
                    length: parseInt(length, 10),
                    offset: parseInt(offset, 10),
                    totalLength: parseInt(totalLength, 10),
                    data: ctx.req,
                }
            )
        );
        ctx.status = HttpStatus.OK;
    });
}

export function setupPreAuthDocRoutes(router: Router, config: EsServerConfig): void {
    const { pool, rolePolicies } = config;

    router.get('/document/download', async ctx => {
        const { token } = ctx.request.query;
        let downloadToken: DownloadToken;
        try {
            downloadToken = await verifyJwt(token, docJwtSecret);
        } catch (err) {
            ctx.throw(HttpStatus.BAD_REQUEST, err.message);
        }

        const { documentId, revision, userId } = downloadToken;
        if (!documentId || !revision || !userId) {
            ctx.throw(HttpStatus.BAD_REQUEST);
        }
        const fd = await pool.connect(async db => {
            const roles = await UserDao.rolesById(db, userId);
            const auth = {
                userId,
                userPerms: rolePolicies.user.permissions(roles),
            };
            const res = await DocumentRevisionControl.download(
                {
                    db,
                    auth,
                    config,
                },
                documentId,
                revision
            );
            if (DocumentRevisionControl.isFileError(res)) {
                if (res === DocumentRevisionControl.FileError.NotExist) {
                    ctx.throw(HttpStatus.NOT_FOUND);
                } else if (res == DocumentRevisionControl.FileError.Forbidden) {
                    ctx.throw(HttpStatus.FORBIDDEN);
                }
            }
            return res as DocumentRevisionControl.FileDownload;
        });
        const stream = fs.createReadStream(fd.filepath);
        ctx.set('Content-Disposition', `attachment; filename=${fd.docRev.filename}`);
        ctx.set('Content-Type', mime.getType(fd.docRev.filename));
        ctx.response.length = fd.docRev.filesize;
        ctx.response.body = stream;
    });
}
