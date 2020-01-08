import defaultRolePolicies from './defaultRolePolicies.json';
import { buildRolePolicy, RolePolicy } from './permissions';
import { Id } from './schema';

export { CProject, CUser } from './ctor';
export {
    buildRolePolicy,
    RoleDescriptor,
    RoleDescriptorSet,
    RolePolicy,
    UnknownRoleError,
} from './permissions';
export {
    DateTime,
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    DocumentSearch,
    Id,
    Project,
    ProjectEx,
    ProjectInput,
    ProjectMember,
    ProjectMemberInput,
    User,
    UserEx,
    UserInput,
} from './schema';

export interface AppRolePolicies {
    user: RolePolicy;
    project: RolePolicy;
}

export function buildDefaultAppRolePolicies(): AppRolePolicies {
    return {
        user: buildRolePolicy(defaultRolePolicies.user),
        project: buildRolePolicy(defaultRolePolicies.project),
    };
}

export interface AuthToken {
    userId: Id;
    userPerms: string[];
}
