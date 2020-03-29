import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, dao, pool, th } from '.';
import { permsAuth } from './auth';

const DOCREV_FIELDS = gql`
    fragment DocRevFields on DocumentRevision {
        id
        document {
            id
        }
        revision
        filename
        filesize
        createdBy {
            id
        }
        createdAt
        changeDescription
        uploaded
        sha1
    }
`;

const DOCREV_READ = gql`
    query ReadDocRev($id: ID!) {
        documentRevision(id: $id) {
            ...DocRevFields
        }
    }
    ${DOCREV_FIELDS}
`;

const DOC_READ_LAST_REV = gql`
    query ReadLastDocRev($docId: ID!) {
        document(id: $docId) {
            lastRevision {
                ...DocRevFields
            }
        }
    }
    ${DOCREV_FIELDS}
`;

const DOC_READ_ALL_REVS = gql`
    query ReadAllDocRevs($docId: ID!) {
        document(id: $docId) {
            revisions {
                ...DocRevFields
            }
        }
    }
    ${DOCREV_FIELDS}
`;

const DOC_REVISE = gql`
    mutation ReviseDocument($input: DocumentRevisionInput!) {
        documentRevise(input: $input) {
            ...DocRevFields
            document {
                checkout {
                    id
                }
            }
        }
    }
    ${DOCREV_FIELDS}
`;

describe('GraphQL Document Revision', function() {
    let users;
    let document;

    before('Create users and document', async function() {
        await pool.transaction(async db => {
            users = await th.createUsersAB(db);
            document = await th.createDoc(db, users.a, {
                name: 'a',
                description: 'doc A',
                initialCheckout: true,
            });
        });
    });
    after('Delete users and document', th.cleanTables(pool, ['document', 'user']));

    describe('Query', function() {
        let revisions;

        before('Create revisions', async function() {
            revisions = await pool.transaction(async db => {
                const rev1 = await th.createDocRev(db, document, users.a, {
                    filesize: 1000,
                    filename: 'file_v1.ext',
                    changeDescription: 'creation',
                });
                const rev2 = await th.createDocRev(db, document, users.a, {
                    filesize: 2000,
                    filename: 'file_v2.ext',
                    changeDescription: 'update 1',
                });
                const rev3 = await th.createDocRev(db, document, users.a, {
                    filesize: 3000,
                    filename: 'file_v3.ext',
                    changeDescription: 'update 2',
                });
                const rev4 = await th.createDocRev(db, document, users.a, {
                    filesize: 4000,
                    filename: 'file_v4.ext',
                    changeDescription: 'update 3',
                });
                await Promise.all([
                    dao.documentRevision.updateAddProgress(db, rev1.id, 1000),
                    dao.documentRevision.updateAddProgress(db, rev2.id, 2000),
                    dao.documentRevision.updateAddProgress(db, rev3.id, 3000),
                    dao.documentRevision.updateAddProgress(db, rev4.id, 3500),
                    dao.documentRevision.updateSha1(db, rev1.id, 'aa'.repeat(10)),
                    dao.documentRevision.updateSha1(db, rev2.id, 'ab'.repeat(10)),
                    dao.documentRevision.updateSha1(db, rev3.id, 'ac'.repeat(10)),
                ]);
                return [rev1, rev2, rev3, rev4];
            });
        });

        after('Delete revisions', async function() {
            await pool.transaction(async db => dao.documentRevision.deleteAll(db));
        });

        it('should read document revision with "document.read"', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['document.read', 'user.read'])
                );
                return query({
                    query: DOCREV_READ,
                    variables: { id: revisions[2].id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.documentRevision).to.deep.include({
                id: revisions[2].id,
                document: { id: document.id },
                revision: 3,
                filename: 'file_v3.ext',
                filesize: 3000,
                createdBy: { id: users.a.id },
                createdAt: revisions[2].createdAt,
                changeDescription: 'update 2',
                uploaded: 3000,
                sha1: 'ac'.repeat(10),
            });
        });

        it('should not read document revision without "document.read"', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.a, ['user.read']));
                return query({
                    query: DOCREV_READ,
                    variables: { id: revisions[2].id },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(data.documentRevision).to.be.null;
        });

        it('should read document last revision', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['document.read', 'user.read'])
                );
                return query({
                    query: DOC_READ_LAST_REV,
                    variables: { docId: document.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.document).to.deep.include({
                lastRevision: {
                    id: revisions[3].id,
                    document: { id: document.id },
                    revision: 4,
                    filename: 'file_v4.ext',
                    filesize: 4000,
                    createdBy: { id: users.a.id },
                    createdAt: revisions[3].createdAt,
                    changeDescription: 'update 3',
                    uploaded: 3500,
                    sha1: null,
                },
            });
        });

        it('should read all document revisions', async function() {
            const { errors, data } = await pool.transaction(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['document.read', 'user.read'])
                );
                return query({
                    query: DOC_READ_ALL_REVS,
                    variables: { docId: document.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.document.revisions)
                .to.be.an('array')
                .with.lengthOf(4);
            expect(data.document.revisions[0]).to.deep.include({
                id: revisions[0].id,
                revision: 1,
            });
            expect(data.document.revisions[1]).to.deep.include({
                id: revisions[1].id,
                revision: 2,
            });
            expect(data.document.revisions[2]).to.deep.include({
                id: revisions[2].id,
                revision: 3,
            });
            expect(data.document.revisions[3]).to.deep.include({
                id: revisions[3].id,
                revision: 4,
            });
        });

        it('should read recursively', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['document.read', 'user.read'])
                );
                return query({
                    query: gql`
                        query RecursiveDocRead($docId: ID!) {
                            document(id: $docId) {
                                id
                                name
                                revisions {
                                    id
                                    document {
                                        id
                                        name
                                        lastRevision {
                                            id
                                        }
                                    }
                                }
                                lastRevision {
                                    id
                                    document {
                                        id
                                        name
                                        revisions {
                                            id
                                        }
                                    }
                                }
                            }
                        }
                    `,
                    variables: { docId: document.id },
                });
            });
            expect(errors).to.be.undefined;
            expect(data.document).to.deep.include({
                id: document.id,
                name: 'a',
                revisions: revisions.map(r => ({
                    id: r.id,
                    document: {
                        id: document.id,
                        name: 'a',
                        lastRevision: {
                            id: revisions[3].id,
                        },
                    },
                })),
                lastRevision: {
                    id: revisions[3].id,
                    document: {
                        id: document.id,
                        name: 'a',
                        revisions: revisions.map(r => ({
                            id: r.id,
                        })),
                    },
                },
            });
        });
    });

    describe('Mutation', function() {
        describe('Create', function() {
            afterEach('Delete revisions', async function() {
                await pool.transaction(async db => dao.documentRevision.deleteAll(db));
            });

            it('should revise a document with "document.revise"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, ['document.revise', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_REVISE,
                        variables: {
                            input: {
                                documentId: document.id,
                                filename: 'file.ext',
                                filesize: 1000,
                                changeDescription: 'update',
                                retainCheckout: false,
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data.documentRevise.id).to.be.uuid();
                expect(data.documentRevise).to.deep.include({
                    document: {
                        id: document.id,
                        checkout: null,
                    },
                    filename: 'file.ext',
                    filesize: 1000,
                    changeDescription: 'update',
                    createdBy: {
                        id: users.a.id,
                    },
                    uploaded: 0,
                    sha1: null,
                });
            });

            it('should not revise a document without "document.revise"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, ['document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_REVISE,
                        variables: {
                            input: {
                                documentId: document.id,
                                filename: 'file.ext',
                                filesize: 1000,
                                changeDescription: 'update',
                                retainCheckout: false,
                            },
                        },
                    });
                });
                expect(errors).to.be.an('array').not.empty;
                expect(data).to.be.null;
            });

            it('should not revise a document checked-out by someone else', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await th.createDoc(db, users.a, {
                        name: 'b',
                        description: 'doc B',
                        initialCheckout: true,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.b, ['document.revise', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_REVISE,
                        variables: {
                            input: {
                                documentId: doc.id,
                                filename: 'file.ext',
                                filesize: 1000,
                                changeDescription: 'update',
                                retainCheckout: false,
                            },
                        },
                    });
                });
                expect(errors).to.be.an('array').not.empty;
                expect(errors[0].message).to.contain(users.a.fullName);
                expect(data).to.be.null;
            });
        });
    });
});
