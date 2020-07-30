import { IResolvers, UserInputError } from 'apollo-server-koa';
import { GraphQLScalarType, ValueNode, Kind } from 'graphql';
import gql from 'graphql-tag';
import {
    DateTime,
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    DocumentSearch,
    Id,
    User,
    Tracked,
} from '@engspace/core';
import { GqlContext } from '../context';

export default {
    typeDefs: gql`
        scalar DateTime

        interface Tracked {
            createdBy: User!
            createdAt: DateTime!
            updatedBy: User!
            updatedAt: DateTime!
        }

        enum ApprovalDecision {
            PENDING
            REJECTED
            RESERVED
            APPROVED
        }

        enum ValidationResult {
            RELEASE
            TRY_AGAIN
            CANCEL
        }

        input DocumentInput {
            name: String!
            description: String
            initialCheckout: Boolean
        }
        type Document {
            id: ID!
            name: String!
            description: String
            createdBy: User!
            createdAt: DateTime!
            checkout: User

            revisions: [DocumentRevision!]!
            lastRevision: DocumentRevision
        }
        type DocumentSearch {
            count: Int!
            documents: [Document!]!
        }

        input DocumentRevisionInput {
            documentId: ID!
            filename: String!
            filesize: Int!
            changeDescription: String
            retainCheckout: Boolean
        }

        type DocumentRevision {
            id: ID!
            document: Document!
            revision: Int!
            filename: String!
            filesize: Int!
            createdBy: User!
            createdAt: DateTime!
            changeDescription: String
            uploaded: Int
            sha1: String
        }

        type Query {
            document(id: ID!): Document
            documentSearch(search: String, offset: Int = 0, limit: Int = 1000): DocumentSearch!
            documentRevision(id: ID!): DocumentRevision

            testDateTimeToIso8601(dt: DateTime!): String!
        }

        type Mutation {
            documentCreate(input: DocumentInput!): Document!
            documentCheckout(id: ID!, revision: Int!): Document!
            documentDiscardCheckout(id: ID!): Document!
            documentRevise(input: DocumentRevisionInput): DocumentRevision!
            documentRevisionCheck(id: ID!, sha1: String!): DocumentRevision!
        }
    `,

    resolvers: {
        DateTime: new GraphQLScalarType({
            name: 'DateTime',
            description: 'DateTime sent over the wire as milliseconds since epoch',
            serialize(value: number): number {
                return value;
            },
            parseValue(value: number): number {
                return value;
            },
            parseLiteral(ast: ValueNode): number | null {
                if (ast.kind === Kind.INT) {
                    return parseInt(ast.value);
                } else if (ast.kind === Kind.STRING) {
                    const date = new Date(ast.value);
                    const ms = date.getTime();
                    if (isNaN(ms)) {
                        throw new UserInputError(
                            `Cannot read DateTime from ${ast.kind}: ${ast.value}`
                        );
                    }
                    return ms;
                }
                throw new UserInputError(`Cannot read DateTime from ${ast.kind}`);
            },
        }),

        Tracked: {
            __resolveType(tracked: Tracked): string {
                if (tracked['ref']) return 'Part';
                return null;
            },
        },

        Document: {
            createdBy({ createdBy }: Document, args: unknown, ctx: GqlContext): Promise<User> {
                return ctx.loaders.user.load(createdBy.id);
            },

            checkout({ checkout }: Document, args: unknown, ctx: GqlContext): Promise<User | null> {
                if (!checkout) return null;
                return ctx.loaders.user.load(checkout.id);
            },

            revisions(
                { id }: Document,
                args: unknown,
                ctx: GqlContext
            ): Promise<DocumentRevision[]> {
                return ctx.runtime.control.documentRevision.byDocumentId(ctx, id);
            },

            lastRevision(
                { id }: Document,
                args: unknown,
                ctx: GqlContext
            ): Promise<DocumentRevision | null> {
                return ctx.runtime.control.documentRevision.lastByDocumentId(ctx, id);
            },
        },

        DocumentRevision: {
            document(
                { document }: DocumentRevision,
                args: unknown,
                ctx: GqlContext
            ): Promise<Document> {
                return ctx.runtime.control.document.byId(ctx, document.id);
            },
            createdBy(
                { createdBy }: DocumentRevision,
                args: unknown,
                ctx: GqlContext
            ): Promise<User> {
                return ctx.loaders.user.load(createdBy.id);
            },
        },

        Query: {
            document(
                parent: unknown,
                { id }: { id: Id },
                ctx: GqlContext
            ): Promise<Document | null> {
                return ctx.runtime.control.document.byId(ctx, id);
            },
            documentSearch(
                parent: unknown,
                { search, offset, limit }: { search: string; offset: number; limit: number },
                ctx: GqlContext
            ): Promise<DocumentSearch> {
                return ctx.runtime.control.document.search(ctx, search, offset, limit);
            },
            documentRevision(
                parent: unknown,
                { id }: { id: Id },
                ctx: GqlContext
            ): Promise<DocumentRevision | null> {
                return ctx.runtime.control.documentRevision.byId(ctx, id);
            },

            testDateTimeToIso8601(parent: unknown, { dt }: { dt: DateTime }): Promise<string> {
                const date = new Date(dt);
                return Promise.resolve(date.toISOString());
            },
        },

        Mutation: {
            documentCreate(
                parent: unknown,
                { input }: { input: DocumentInput },
                ctx: GqlContext
            ): Promise<Document> {
                return ctx.runtime.control.document.create(ctx, input);
            },

            documentCheckout(
                parent: unknown,
                { id, revision }: { id: Id; revision: number },
                ctx: GqlContext
            ): Promise<Document> {
                return ctx.runtime.control.document.checkout(ctx, id, revision);
            },

            documentDiscardCheckout(
                parent: unknown,
                { id }: { id: Id },
                ctx: GqlContext
            ): Promise<Document> {
                return ctx.runtime.control.document.discardCheckout(ctx, id);
            },

            documentRevise(
                parent: unknown,
                { input }: { input: DocumentRevisionInput },
                ctx: GqlContext
            ): Promise<DocumentRevision> {
                return ctx.runtime.control.documentRevision.create(ctx, input);
            },

            documentRevisionCheck(
                parent: unknown,
                { id, sha1 }: { id: Id; sha1: string },
                ctx: GqlContext
            ): Promise<DocumentRevision> {
                return ctx.runtime.control.documentRevision.finalizeUpload(ctx, id, sha1);
            },
        },
    },
};
