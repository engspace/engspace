import { Role } from './schema';

interface RolePerm {
    inherits?: Role;
    permissions: string[];
}

const rolePerms: { [role: string]: RolePerm } = {
    [Role.User]: {
        permissions: ['member.get', 'project.get', 'user.get', 'login.get', 'login.patch'],
    },
    [Role.Manager]: {
        inherits: Role.User,
        permissions: [
            'project.post',
            'project.patch',
            'member.post',
            'member.patch',
            'member.delete',
        ],
    },
    [Role.Admin]: {
        inherits: Role.Manager,
        permissions: ['user.post', 'user.patch', 'user.delete', 'project.delete'],
    },
};

export class UnknownRoleError extends Error {
    constructor(public role: string) {
        super(`Unknown Role: ${role}`);
        Object.setPrototypeOf(this, UnknownRoleError.prototype);
    }
}

/**
 * Return permissions granted for a single Role
 *
 * @param role The role to fetch the permissions for.
 */
export function getRolePerms(role: Role): string[] {
    const rp = rolePerms[role];
    if (!rp) {
        throw new UnknownRoleError(role);
    }
    let perms = rp.permissions;
    let inherits = rp.inherits;
    while (inherits) {
        const childRp = rolePerms[inherits];
        perms = perms.concat(childRp.permissions);
        inherits = childRp.inherits;
    }
    return perms;
}

/**
 * Return permissions granted for a set of Roles
 *
 * @param roles The roles to fetch the permissions for.
 */
export function getRolesPerms(roles: Role[]): string[] {
    if (roles.length == 0) {
        return [];
    }
    if (roles.length == 1) {
        return getRolePerms(roles[0]);
    }
    const visited: Role[] = [];
    let perms = [];
    for (const r of roles) {
        if (visited.includes(r)) continue;
        const rp = rolePerms[r];
        if (!rp) throw new UnknownRoleError(r);
        perms = perms.concat(rp.permissions);
        visited.push(r);
        let inherits = rp.inherits;
        while (inherits) {
            const childRp = rolePerms[inherits];
            if (!visited.includes(inherits)) {
                perms = perms.concat(childRp.permissions);
                visited.push(inherits);
            }
            inherits = childRp.inherits;
        }
    }
    return perms;
}
