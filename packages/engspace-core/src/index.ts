import { IUser, IProject, IProjectMember } from './schema';
import UserSchema from './schema/IUser.json';
import ProjectSchema from './schema/IProject.json';
import {
    CheckFunction,
    ValidateFunction,
    AssertFunction,
    createValidation,
} from './validation';

export { IUser, IProject, IProjectMember };

export class User implements IUser {
    id?: number | undefined;
    name = '';
    email = '';
    fullName = '';
    admin = false;
    manager = false;
    password?: string | undefined;

    static check: CheckFunction<IUser>;
    static validate: ValidateFunction<IUser>;
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
    static validate: ValidateFunction<IProject>;
    static assert: AssertFunction<IProject>;

    constructor(obj: Partial<IProject> = {}) {
        Object.assign(this, obj);
    }
}
createValidation<IProject>(Project, ProjectSchema, 'Project');
