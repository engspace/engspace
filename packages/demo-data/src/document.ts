import { Document, DocumentInput, DocumentRevisionInput, DocumentRevision } from '@engspace/core';
import { DemoUserSet, DemoUser } from './user';
import { DocumentDao, Db, DocumentRevisionDao } from '@engspace/server-db';
import path from 'path';
import fs from 'fs';
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
        filepath: '$DEMO_FILES/code_of_conduct.odt',
    },
    {
        name: 'Chair specs',
        description: 'Chair Incredible product specifications',
        creator: DemoUser.Tania,
        filepath: '$DEMO_FILES/chair_spec.odt',
    },
];

const demoFilePath = `${__dirname}/../demo_files`;

function resolvePath(filepath: string): string {
    return path.normalize(filepath.replace('$DEMO_FILES', demoFilePath));
}

async function fileSize(filepath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        fs.stat(filepath, (err, stats) => {
            if (err) return reject(err);
            return resolve(stats.size);
        });
    });
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
        } catch (error) {
            return reject(error);
        }
    });
}

async function createRevision(db: Db, doc: Document, filepath: string): Promise<DocumentRevision> {
    const resolved = resolvePath(filepath);
    const input: DocumentRevisionInput = {
        documentId: doc.id,
        filename: path.basename(resolved),
        filesize: await fileSize(resolved),
        sha1: await fileSha1Hash(resolved),
        changeDescription: 'Initial upload',
        retainCheckout: false,
    };
    return DocumentRevisionDao.create(db, input, doc.createdBy.id);
}

async function createDocument(
    db: Db,
    { name, description, creator, filepath }: DemoDocInput,
    users: Promise<DemoUserSet>
): Promise<Document> {
    const input: DocumentInput = {
        name,
        description,
        initialCheckout: true,
    };
    const usrs = await users;
    const doc = await DocumentDao.create(db, input, usrs[creator].id);
    const rev = await createRevision(db, doc, filepath);
    doc.revisions = [rev];
    doc.lastRevision = rev;
    return doc;
}

export async function createDocuments(db: Db, users: Promise<DemoUserSet>): Promise<Document[]> {
    return Promise.all(documentInput.map(di => createDocument(db, di, users)));
}
