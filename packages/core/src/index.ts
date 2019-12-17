import { Id } from './schema';

export { CUser } from './ctor';
export { getRolePerms, getRolesPerms } from './permissions';
export {
    Id,
    Project,
    ProjectInput,
    ProjectMember,
    ProjectRole,
    Role,
    User,
    UserInput,
} from './schema';

export interface AuthToken {
    userId: Id;
    userPerms: string[];
}
