import { IUser, IProject, IProjectMember } from './schema';
import UserSchema from './schema/IUser.json';
import ProjectSchema from './schema/IProject.json';
import { ValidateFunction, createValidation } from './validation';

export { IUser, IProject, IProjectMember };

export class User implements IUser {
    id?: number | undefined;
    name = '';
    email = '';
    fullName = '';
    admin = false;
    manager = false;
    password?: string | undefined;

    static validate: ValidateFunction<IUser>;

    constructor(obj: Partial<IUser> = {}) {
        Object.assign(this, obj);
    }
}
User.validate = createValidation<IUser>(UserSchema, 'User');

export class Project implements IProject {
    id?: number | undefined;
    name = '';
    code = '';
    description = '';
    members: IProjectMember[] = [];

    static validate: ValidateFunction<IProject>;

    constructor(obj: Partial<IProject> = {}) {
        Object.assign(this, obj);
    }
}
Project.validate = createValidation<IProject>(ProjectSchema, 'Project');

export default {};
