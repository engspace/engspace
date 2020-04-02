import { idType } from '@engspace/server-db';
import { expect } from 'chai';
import gql from 'graphql-tag';
import { buildGqlServer, dao, pool, th } from '.';
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
    mutation CreateDoc($input: DocumentInput!) {
        documentCreate(input: $input) {
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
        users = await th.transacUsers({
            a: { name: 'a' },
            b: { name: 'b' },
            c: { name: 'c' },
            d: { name: 'd' },
        });
    });

    after('Delete users', th.cleanTable('user'));

    describe('Query', function() {
        let docs;
        before('Create documents', async function() {
            docs = await pool.transaction(async db => {
                return {
                    a: await th.createDoc(db, users.a, {
                        name: 'a',
                        description: 'doc A',
                    }),
                    b: await th.createDoc(db, users.b, {
                        name: 'b',
                        description: 'doc B',
                    }),
                    c: await th.createDoc(db, users.c, {
                        name: 'c',
                        description: 'doc C',
                    }),
                    d: await th.createDoc(db, users.d, {
                        name: 'd',
                        description: 'doc D',
                    }),
                };
            });
        });
        after('Delete documents', th.cleanTable('document'));

        it('should read a document with "document.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['document.read', 'user.read'])
                );
                return query({
                    query: DOC_READ,
                    variables: {
                        id: docs.b.id,
                    },
                });
            });
            expect(errors).to.be.undefined;
            expect(data).to.be.an('object');
            expect(data.document).to.deep.include(docs.b);
        });
        it('should not read a document without "document.read"', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(db, permsAuth(users.a, ['user.read']));
                return query({
                    query: DOC_READ,
                    variables: {
                        id: docs.b.id,
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
                    permsAuth(users.a, ['document.read', 'user.read'])
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
                documents: [docs.b],
            });
        });
        it('should search documents with pagination', async function() {
            const { errors, data } = await pool.connect(async db => {
                const { query } = buildGqlServer(
                    db,
                    permsAuth(users.a, ['document.read', 'user.read'])
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
                const { query } = buildGqlServer(db, permsAuth(users.a, ['user.read']));
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
            await pool.transaction(async db => dao.document.deleteAll(db));
        });

        describe('Create', function() {
            it('should create a document with "document.create"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, ['document.create', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_CREATE,
                        variables: {
                            input: {
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
                    createdBy: { id: users.a.id },
                    checkout: { id: users.a.id },
                });
                expect(data.documentCreate.id).to.be.a(idType);
                expect(data.documentCreate.createdAt)
                    .to.be.at.least(msBefore)
                    .and.at.most(Date.now());
            });
            it('should create a document without initial checkout', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, ['document.create', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_CREATE,
                        variables: {
                            input: {
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
                    createdBy: { id: users.a.id },
                    checkout: null,
                });
                expect(data.documentCreate.id).to.be.a(idType);
                expect(data.documentCreate.createdAt)
                    .to.be.at.least(msBefore)
                    .and.at.most(Date.now());
            });
            it('should not create a document without "document.create"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, ['document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_CREATE,
                        variables: {
                            input: {
                                name: 'a',
                                description: 'doc A',
                                initialCheckout: true,
                            },
                        },
                    });
                });
                expect(errors).to.be.an('array').not.empty;
                expect(errors[0].message).to.contain('document.create');
                expect(data).to.be.null;
            });
        });

        describe('Checkout', function() {
            it('should checkout a free document with "document.revise"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await th.createDoc(db, users.a, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: false,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.b, ['document.revise', 'document.read', 'user.read'])
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
                    createdBy: { id: users.a.id },
                    checkout: { id: users.b.id },
                });
            });
            it('should not checkout a free document without "document.revise"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await th.createDoc(db, users.a, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: false,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.b, ['document.read', 'user.read'])
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
                    const doc = await th.createDoc(db, users.a, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: true,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.b, ['document.revise', 'document.read', 'user.read'])
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
                expect(errors[0].message).to.contain(users.a.fullName);
                expect(data).to.be.null;
            });
            it('should not checkout with wrong revision', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await th.createDoc(db, users.a, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: false,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.b, ['document.revise', 'document.read', 'user.read'])
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
                    const doc = await th.createDoc(db, users.a, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: true,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, ['document.revise', 'document.read', 'user.read'])
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
                    createdBy: { id: users.a.id },
                    checkout: null,
                });
            });

            it('should not discard a used document without "document.revise"', async function() {
                const { errors, data } = await pool.transaction(async db => {
                    const doc = await th.createDoc(db, users.a, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: true,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.a, ['document.read', 'user.read'])
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
                    const doc = await th.createDoc(db, users.a, {
                        name: 'a',
                        description: 'doc A',
                        initialCheckout: true,
                    });
                    const { mutate } = buildGqlServer(
                        db,
                        permsAuth(users.b, ['document.revise', 'document.read', 'user.read'])
                    );
                    return mutate({
                        mutation: DOC_DISCARD_CHECKOUT,
                        variables: {
                            id: doc.id,
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
