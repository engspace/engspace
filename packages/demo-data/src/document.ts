import { Document, DocumentInput, DocumentRevisionInput, DocumentRevision } from '@engspace/core';
import { DemoUserSet, DemoUser } from './user';
import { documentDao, Db, documentRevisionDao } from '@engspace/server-db';
import path from 'path';
import fs from 'fs';
import util from 'util';
import crypto from 'crypto';

interface DemoDocInput {
    name: string;
    description: string;
    creator: DemoUser;
    filepath: string;
}

export const documentInput: DemoDocInput[] = [
    {
        name: 'Code of conduct',
        description: 'Code of conduct for Engineering Space',
        creator: DemoUser.Gerard,
        filepath: '$DEMO_FILES/code_of_conduct.pdf',
    },
    {
        name: 'Chair specs',
        description: 'Chair Incredible product specifications',
        creator: DemoUser.Tania,
        filepath: '$DEMO_FILES/chair_spec.odt',
    },
];

const demoFilePath = `${__dirname}/../demo_files`;

const copyFileP = util.promisify(fs.copyFile);
const mkdirP = util.promisify(fs.mkdir);
const rmdirP = util.promisify(fs.rmdir);
const statP = util.promisify(fs.stat);

function resolvePath(filepath: string): string {
    return path.normalize(filepath.replace('$DEMO_FILES', demoFilePath));
}

function fileSha1Hash(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const shasum = crypto.createHash('sha1');
        try {
            const s = fs.createReadStream(filepath);
            s.on('data', function(data) {
                shasum.update(data);
            });
            // making digest
            s.on('end', function() {
                const hash = shasum.digest('hex');
                return resolve(hash);
            });
            s.on('error', function(err) {
                reject(err);
            });
        } catch (error) {
            return reject(error);
        }
    });
}

async function createRevision(
    db: Db,
    doc: Document,
    filepath: string,
    storePath: string
): Promise<DocumentRevision> {
    const resolved = resolvePath(filepath);
    const input: DocumentRevisionInput = {
        documentId: doc.id,
        filename: path.basename(resolved),
        filesize: (await statP(resolved)).size,
        changeDescription: 'Initial upload',
        retainCheckout: false,
    };
    const sha1 = (await fileSha1Hash(resolved)).toLowerCase();
    await copyFileP(resolved, path.join(storePath, sha1));
    const { id } = await documentRevisionDao.create(db, input, doc.createdBy.id);
    return documentRevisionDao.updateSha1(db, id, sha1);
}

async function createDocument(
    db: Db,
    { name, description, creator, filepath }: DemoDocInput,
    users: Promise<DemoUserSet>,
    storePath: string
): Promise<Document> {
    const input: DocumentInput = {
        name,
        description,
        initialCheckout: true,
    };
    const usrs = await users;
    const doc = await documentDao.create(db, input, usrs[creator].id);
    const rev = await createRevision(db, doc, filepath, storePath);
    doc.revisions = [rev];
    doc.lastRevision = rev;
    return doc;
}

export async function createDocuments(
    db: Db,
    users: Promise<DemoUserSet>,
    storePath: string
): Promise<Document[]> {
    await rmdirP(storePath, { recursive: true });
    await mkdirP(storePath, { recursive: true });
    return Promise.all(documentInput.map(di => createDocument(db, di, users, storePath)));
}
