import { makeExecutableSchema, IResolvers } from 'apollo-server-koa';
import { GraphQLSchema, DocumentNode } from 'graphql';
import _ from 'lodash';
import { User, Tracked } from '@engspace/core';
import { GqlContext } from '../context';
import baseGqlModule from './base';
import changeGqlModule from './change';
import partGqlModule from './part';
import projectGqlModule from './project';
import userGqlModule from './user';

export { baseGqlModule, userGqlModule, projectGqlModule, changeGqlModule, partGqlModule };

export const resolveTracked = {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    createdBy({ createdBy }: Tracked, args: unknown, ctx: GqlContext): Promise<User> {
        return ctx.loaders.user.load(createdBy.id);
    },
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    updatedBy({ updatedBy }: Tracked, args: unknown, ctx: GqlContext): Promise<User> {
        return ctx.loaders.user.load(updatedBy.id);
    },
};

export interface GqlEsModule {
    typeDefs: DocumentNode;
    resolvers: IResolvers;
}

export const defaultGqlModules: GqlEsModule[] = [
    baseGqlModule,
    userGqlModule,
    projectGqlModule,
    changeGqlModule,
    partGqlModule,
];

export function buildEsSchema(modules?: GqlEsModule[]): GraphQLSchema {
    if (!modules) {
        modules = defaultGqlModules;
    }
    return makeExecutableSchema({
        typeDefs: modules.map((m) => m.typeDefs),
        resolvers: _.merge({}, ...modules.map((m) => m.resolvers)),
    });
}
