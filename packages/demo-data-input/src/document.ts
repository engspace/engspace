import { Document, DocumentRevisionInput } from '@engspace/core';
import { DemoUser } from './user';
import path from 'path';
import fs from 'fs';
import util from 'util';
import crypto from 'crypto';

export interface DemoDocInput {
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

export async function prepareRevision(
    doc: Promise<Document>,
    filepath: string,
    storePath: string
): Promise<{ sha1: string; input: DocumentRevisionInput }> {
    const resolved = resolvePath(filepath);
    const sha1 = (await fileSha1Hash(resolved)).toLowerCase();
    await copyFileP(resolved, path.join(storePath, sha1));
    const documentId = (await doc).id;
    const input: DocumentRevisionInput = {
        documentId,
        filename: path.basename(resolved),
        filesize: (await statP(resolved)).size,
        changeDescription: 'Initial upload',
        retainCheckout: false,
    };
    return { sha1, input };
}

export async function prepareStore(storePath: string): Promise<void> {
    await rmdirP(storePath, { recursive: true });
    await mkdirP(storePath, { recursive: true });
}
