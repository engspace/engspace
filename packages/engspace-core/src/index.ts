import { Role, IUser, IProject, IProjectMember } from './schema';
import UserSchema from './schema/IUser.json';
import ProjectSchema from './schema/IProject.json';
import { CheckFunction, ValidateFunction, AssertFunction, createValidation } from './validation';
export { getRolePerms, getRolesPerms } from './permissions';

export { Role, IUser, IProject, IProjectMember };

export interface EngspaceClass<T extends object> {
    check: CheckFunction<T>;
    validate: ValidateFunction;
    assert: AssertFunction<T>;
}

export class User implements IUser {
    id?: number | undefined;
    name = '';
    email = '';
    fullName = '';
    roles = [];
    password?: string | undefined;

    static check: CheckFunction<IUser>;
    static validate: ValidateFunction;
    static assert: AssertFunction<IUser>;

    constructor(obj: Partial<IUser> = {}) {
        Object.assign(this, obj);
    }
}
createValidation<IUser>(User, UserSchema, 'User');

export class Project implements IProject {
    id?: number | undefined;
    name = '';
    code = '';
    description = '';
    members: IProjectMember[] = [];

    static check: CheckFunction<IProject>;
    static validate: ValidateFunction;
    static assert: AssertFunction<IProject>;

    constructor(obj: Partial<IProject> = {}) {
        Object.assign(this, obj);
    }
}
createValidation<IProject>(Project, ProjectSchema, 'Project');
