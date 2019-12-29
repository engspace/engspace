import { Id } from './schema';

export { CProject, CUser } from './ctor';
export { getRolePerms, getRolesPerms } from './permissions';
export {
    Id,
    Project,
    ProjectEx,
    ProjectInput,
    ProjectMember,
    ProjectMemberInput,
    ProjectRole,
    Role,
    User,
    UserEx,
    UserInput,
} from './schema';

export interface AuthToken {
    userId: Id;
    userPerms: string[];
}
