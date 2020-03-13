import { documentDao } from '@engspace/server-db';
import { cleanTable, createDoc, transacDemoUsers } from '@engspace/server-db/dist/test-helpers';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, pool } from '.';
import { permsAuth } from './auth';

const DOC_FIELDS = gql`
    fragment DocFields on Document {
        id
        name
        description
        createdBy {
            id
        }
        createdAt
        checkout {
            id
        }
    }
`;

const DOC_READ = gql`
    query ReadDoc($id: ID!) {
        document(id: $id) {
            ...DocFields
        }
    }
    ${DOC_FIELDS}
`;

const DOC_SEARCH = gql`
    query SearchDocs($search: String!, $offset: Int, $limit: Int) {
        documentSearch(search: $search, offset: $offset, limit: $limit) {
            count
            documents {
                ...DocFields
            }
        }
    }
    ${DOC_FIELDS}
`;

const DOC_CREATE = gql`
    mutation CreateDoc($document: DocumentInput!) {
        documentCreate(document: $document) {
            ...DocFields
        }
    }
    ${DOC_FIELDS}
`;

const DOC_CHECKOUT = gql`
    mutation CheckoutDoc($id: ID!, $revision: Int!) {
        documentCheckout(id: $id, revision: $revision) {
            ...DocFields
        }
    }
    ${DOC_FIELDS}
`;

const DOC_DISCARD_CHECKOUT = gql`
    mutation DiscardCheckoutDoc($id: ID!) {
        documentDiscardCheckout(id: $id) {
            ...DocFields
        }
    }
    ${DOC_FIELDS}
`;

describe('GraphQL documents', function() {
    let users;
    before('Create users', async function() {
        users = await transacDemoUsers(pool);
    });

    after('Delete users', cleanTable(pool, 'user'));

    describe('Query', function() {
        let documents;
        before('Create documents', async function() {
            documents = await pool.transaction(async db => {
                return Promise.all([
                    createDoc(db, users.tania, {
                        name: 'a',
                        description: 'doc A',
                    }),
                    createDoc(db, users.gerard, {
                        name: 'b',
                        description: 'doc B',
                    }),
                    createDoc(db, users.alphonse, {
                        name: 'c',
                        description: 'doc C',
                    }),
                    createDoc(db, users.sylvie, {
                        name: 'd',
                        description: 'doc D',
                    }),
                ]);
            });
        });
        after('Delete documents', cleanTable(pool, 'document'));

        it('should read a document with "document.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.tania, ['document.read', 'user.read'])
                );
                return query({
                    query: DOC_READ,
                    variables: {
                        id: documents[2].id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.document).to.deep.include({
                id: documents[2].id,
                name: 'c',
                description: 'doc C',
                createdBy: { id: users.alphonse.id },
                createdAt: documents[2].createdAt,
                checkout: { id: users.alphonse.id },
            });
        });
        it('should not read a document without "document.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.tania, ['user.read']));
                return query({
                    query: DOC_READ,
                    variables: {
                        id: documents[2].id,
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(data).to.be.an('object');
            expect(data.document).to.be.null;
        });
        it('should search documents with "document.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.tania, ['document.read', 'user.read'])
                );
                return query({
                    query: DOC_SEARCH,
                    variables: {
                        search: 'b',
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.documentSearch).to.deep.include({
                count: 1,
                documents: [
                    {
                        id: documents[1].id,
                        name: 'b',
                        description: 'doc B',
                        createdBy: { id: users.gerard.id },
                        createdAt: documents[1].createdAt,
                        checkout: { id: users.gerard.id },
                    },
                ],
            });
        });
        it('should search documents with pagination', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.tania, ['document.read', 'user.read'])
                );
                return query({
                    query: DOC_SEARCH,
                    variables: {
                        search: 'doc',
                        offset: 1,
                        limit: 2,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.documentSearch).to.deep.include({
                count: 4,
            });
            expect(data.documentSearch.documents)
                .to.be.an('array')
                .with.lengthOf(2);
        });
        it('should not search documents without "document.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.tania, ['user.read']));
                return query({
                    query: DOC_SEARCH,
                    variables: {
                        search: 'b',
                    },
                });
            });
            expect(errors).to.be.an('array').not.empty;
            expect(data).to.be.null;
        });
    });
    describe('Mutation', function() {
        const msBefore = Date.now();

        afterEach('Delete documents', async function() {
            await pool.transaction(async db => documentDao.deleteAll(db));
        });

        describe('Create', function() {
            it('should create a document with "document.create"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.tania, ['document.create', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_CREATE,
                        variables: {
                            document: {
                                name: 'a',
                                description: 'doc A',
                                initialCheckout: true,
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data).to.be.an('object');
                expect(data.documentCreate).to.deep.include({
                    name: 'a',
                    description: 'doc A',
                    createdBy: { id: users.tania.id },
                    checkout: { id: users.tania.id },
                });
                expect(data.documentCreate.id).to.be.uuid();
                expect(data.documentCreate.createdAt)
                    .to.be.at.least(msBefore)
                    .and.at.most(Date.now());
            });
            it('should create a document without initial checkout', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.tania, ['document.create', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_CREATE,
                        variables: {
                            document: {
                                name: 'a',
                                description: 'doc A',
                                initialCheckout: false,
                            },
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data).to.be.an('object');
                expect(data.documentCreate).to.deep.include({
                    name: 'a',
                    description: 'doc A',
                    createdBy: { id: users.tania.id },
                    checkout: null,
                });
                expect(data.documentCreate.id).to.be.uuid();
                expect(data.documentCreate.createdAt)
                    .to.be.at.least(msBefore)
                    .and.at.most(Date.now());
            });
            it('should not create a document without "document.create"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.tania, ['document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_CREATE,
                        variables: {
                            document: {
                                name: 'a',
                                description: 'doc A',
                                initialCheckout: true,
                            },
                        },
                    });
                });
                expect(errors).to.be.an('array').not.empty;
                expect(data).to.be.null;
            });
        });

        describe('Checkout', function() {
            it('should checkout a free document with "document.revise"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await createDoc(db, users.tania, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: false,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.pascal, ['document.revise', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_CHECKOUT,
                        variables: {
                            id: doc.id,
                            revision: 0,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data).to.be.an('object');
                expect(data.documentCheckout).to.deep.include({
                    name: 'a',
                    description: 'doc A',
                    createdBy: { id: users.tania.id },
                    checkout: { id: users.pascal.id },
                });
            });
            it('should not checkout a free document without "document.revise"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await createDoc(db, users.tania, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: false,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.pascal, ['document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_CHECKOUT,
                        variables: {
                            id: doc.id,
                            revision: 0,
                        },
                    });
                });
                expect(errors).to.be.an('array').not.empty;
                expect(data).to.be.null;
            });
            it('should not checkout a busy document', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await createDoc(db, users.tania, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: true,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.pascal, ['document.revise', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_CHECKOUT,
                        variables: {
                            id: doc.id,
                            revision: 0,
                        },
                    });
                });
                expect(errors).to.be.an('array').not.empty;
                expect(errors[0].message).to.contain(users.tania.fullName);
                expect(data).to.be.null;
            });
            it('should not checkout with wrong revision', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await createDoc(db, users.tania, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: false,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.pascal, ['document.revise', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_CHECKOUT,
                        variables: {
                            id: doc.id,
                            revision: 1,
                        },
                    });
                });
                expect(errors).to.be.an('array').not.empty;
                expect(data).to.be.null;
            });
        });

        describe('Discard checkout', function() {
            it('should discard a used document with "document.revise"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await createDoc(db, users.tania, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: true,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.tania, ['document.revise', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_DISCARD_CHECKOUT,
                        variables: {
                            id: doc.id,
                        },
                    });
                });
                expect(errors).to.be.undefined;
                expect(data).to.be.an('object');
                expect(data.documentDiscardCheckout).to.deep.include({
                    name: 'a',
                    description: 'doc A',
                    createdBy: { id: users.tania.id },
                    checkout: null,
                });
            });

            it('should not discard a used document without "document.revise"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await createDoc(db, users.tania, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: true,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.tania, ['document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_DISCARD_CHECKOUT,
                        variables: {
                            id: doc.id,
                        },
                    });
                });
                expect(errors).to.be.an('array').not.empty;
                expect(data).to.be.null;
            });

            it('should not discard a document used by another user', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await createDoc(db, users.tania, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: true,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.pascal, ['document.revise', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_DISCARD_CHECKOUT,
                        variables: {
                            id: doc.id,
                        },
                    });
                });
                expect(errors).to.be.an('array').not.empty;
                expect(errors[0].message).to.contain(users.tania.fullName);
                expect(data).to.be.null;
            });
        });
    });
});
