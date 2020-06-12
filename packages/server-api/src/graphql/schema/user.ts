import { Id, ProjectMember, User, UserInput } from '@engspace/core';
import { IResolvers } from 'apollo-server-koa';
import gql from 'graphql-tag';
import { ControllerSet } from '../../control';
import { GqlContext } from '../context';

export const typeDefs = gql`
    input UserInput {
        name: String!
        email: String!
        fullName: String
        roles: [String!]
    }
    type User {
        id: ID!
        name: String!
        email: String!
        fullName: String
        roles: [String!]!
        membership: [ProjectMember!]!
    }
    type UserSearch {
        count: Int!
        users: [User!]!
    }

    extend type Query {
        user(id: ID!): User
        userByName(name: String!): User
        userByEmail(email: String!): User
        userSearch(search: String, offset: Int = 0, limit: Int = 1000): UserSearch!
    }

    extend type Mutation {
        userCreate(input: UserInput!): User!
        userUpdate(id: ID!, input: UserInput!): User!
    }
`;




export function buildResolvers(control: ControllerSet): IResolvers {
    return {
        User: {
            async roles({ id, roles }: User, args, ctx: GqlContext): Promise<string[]> {
                if (roles) return roles;
                return control.user.rolesById(ctx, id);
            },
            membership({ id }: User, args, ctx: GqlContext): Promise<ProjectMember[]> {
                return control.project.membersByUserId(ctx, id);
            },
        },
        Query: {

            user(parent, { id }, ctx: GqlContext): Promise<User> {
                return ctx.loaders.user.load(id);
            },
            userByName(parent, { name }, ctx: GqlContext): Promise<User> {
                return control.user.byName(ctx, name);
            },
            userByEmail(parent, { email }, ctx: GqlContext): Promise<User> {
                return control.user.byEmail(ctx, email);
            },
            userSearch(parent, args, ctx: GqlContext): Promise<{ count: number; users: User[] }> {
                const { search, offset, limit } = args;
                return control.user.search(ctx, search, { offset, limit });
            },
        },
        Mutation: {
            userCreate(parent, { input }: { input: UserInput }, ctx: GqlContext): Promise<User> {
                return control.user.create(ctx, input);
            },
            userUpdate(
                parent,
                { id, input }: { id: Id; input: UserInput },
                ctx: GqlContext
            ): Promise<User> {
                return control.user.update(ctx, id, input);
            },

        },
    };
}
export default {
    typeDefs,
    buildResolvers(control: ControllerSet) {
        return {
            Query: {},
            Mutation: {},
        };
    },
};
