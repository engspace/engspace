import sha1 from 'js-sha1';
// import { AxiosResponse } from 'axios';
import { api, authHeader } from '@/api';

const chunkSize = 1000 * 1024;
const maxFlyingChunks = 10;

interface Chunk {
    offset: number;
    buffer: ArrayBuffer;
    waiting: boolean;
}

class UploadService {
    private sha1: sha1.Sha1;
    private waitingChunks: Chunk[];
    private currentOffset: number;
    private uploaded: number;
    //private uploading: Promise<AxiosResponse>;

    constructor(
        private path: string,
        private totalSize: number,
        private progress: (uploaded: number) => void
    ) {
        this.sha1 = sha1.create();
        this.waitingChunks = [];
        this.currentOffset = 0;
        this.uploaded = 0;
    }

    public addBlob(offset: number, blob: Blob): Promise<number> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = event => {
                if (reader.readyState !== FileReader.DONE) {
                    return;
                }

                const buffer = event.target?.result as ArrayBuffer;
                const chunk = {
                    offset,
                    buffer,
                    waiting: true,
                };
                if (chunk.offset === this.currentOffset) {
                    this.uploadChunk(chunk)
                        .then(() => this.checkWaiting())
                        .then(() => {
                            resolve(offset);
                        });
                } else {
                    this.waitingChunks = [...this.waitingChunks, chunk].sort(
                        (a, b) => a.offset - b.offset
                    );
                    this.checkWaiting().then(() => {
                        resolve(offset);
                    });
                }
            };
            reader.onerror = () => {
                reject(reader.error as Error);
            };
            reader.readAsArrayBuffer(blob);
        });
    }

    public async finalize() {
        await this.checkWaiting();

        if (this.waitingChunks.length !== 0) {
            throw new Error('unconsistent upload state');
        }

        return this.sha1.hex();
    }

    private async uploadChunk(chunk: Chunk) {
        const len = chunk.buffer.byteLength;
        this.currentOffset += len;
        chunk.waiting = false;

        const p = api.post(this.path, chunk.buffer, {
            headers: {
                ...authHeader(),
                'Content-Type': 'application/octet-stream',
                'X-Upload-Offset': chunk.offset,
                'X-Upload-Length': this.totalSize,
            },
        });
        this.sha1.update(chunk.buffer);
        await p;
        this.uploaded += len;
        this.progress(this.uploaded);
    }

    private async checkWaiting() {
        for (const chunk of this.waitingChunks) {
            if (chunk.offset === this.currentOffset) {
                await this.uploadChunk(chunk);
            }
        }
        this.waitingChunks = this.waitingChunks.filter(c => c.waiting);
    }
}

/**
 * Engineering space upload service. Protocol is the following:
 *      - Components indicate that an upload will happen (e.g. a document revision)
 *          through a GraphQL mutation.
 *      - Server returns a path for upload.
 *      - this service performs the upload to the given path and returns the sha1 sum
 *          of the uploaded file.
 *      - Component finalize the upload with the conclusion GraphQL mutation, passing the sha1 sum
 *
 * @param file The file to be uploaded.
 * @param path The upload path on the server.
 * @returns The sha1 sum of the uploaded file data.
 */
export async function uploadFile(
    file: File,
    path: string,
    progress: (uploaded: number) => Promise<string>
): Promise<string> {
    const filesize = file.size;
    const service = new UploadService(path, filesize, progress);
    let offset = 0;

    let flyingChunks: { offset: number; promise: Promise<number> }[] = [];

    while (offset < filesize) {
        while (flyingChunks.length >= maxFlyingChunks) {
            const finishedOffset = await Promise.race(flyingChunks.map(fc => fc.promise));
            flyingChunks = flyingChunks.filter(fc => fc.offset !== finishedOffset);
        }

        const blob = file.slice(offset, offset + chunkSize + 1);
        flyingChunks.push({
            offset,
            promise: service.addBlob(offset, blob),
        });
        offset += blob.size;
    }
    await Promise.all(flyingChunks.map(fc => fc.promise));
    return service.finalize();
}
