import { Role } from './schema';

export const rolePermissions: { [role: string]: string[] } = {
    [Role.Admin]: [
        'user.create',
        'user.read',
        'user.update',
        'project.create',
        'project.read',
        'project.update',
    ],
    [Role.Manager]: ['project.create', 'project.read', 'project.update'],
};
