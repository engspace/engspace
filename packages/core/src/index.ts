import { RolePolicy, buildRolePolicy } from './permissions';
import { Id } from './schema';
import defaultRolePolicies from './defaultRolePolicies.json';

export { CProject, CUser } from './ctor';
export {
    buildRolePolicy,
    RoleDescriptor,
    RoleDescriptorSet,
    RolePolicy,
    UnknownRoleError,
} from './permissions';
export {
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
