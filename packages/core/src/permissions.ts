import defaultRolePolicies from './defaultRolePolicies.json';

export class UnknownRoleError extends Error {
    constructor(public role: string) {
        super(`Unknown Role: ${role}`);
        Object.setPrototypeOf(this, UnknownRoleError.prototype);
    }
}

export interface EsRolePolicies {
    user: RolePolicy;
    project: RolePolicy;
}

export interface EsRoleDescriptors {
    user: RoleDescriptorSet;
    project: RoleDescriptorSet;
}

export function buildEsRolePolicies(descriptors: EsRoleDescriptors): EsRolePolicies {
    return {
        user: buildRolePolicy(descriptors.user),
        project: buildRolePolicy(descriptors.project),
    };
}

export function buildDefaultAppRolePolicies(): EsRolePolicies {
    return {
        user: buildRolePolicy(defaultRolePolicies.user),
        project: buildRolePolicy(defaultRolePolicies.project),
    };
}

export interface RolePolicy {
    allRoles(): string[];
    permissions(roles?: string[]): string[];
}

export interface RoleDescriptor {
    /** inherits permissions of another role */
    inherits?: string;
    /** permissions given by this role */
    permissions: string[];
}

export interface RoleDescriptorSet {
    [role: string]: RoleDescriptor;
}

export function buildRolePolicy(roleDescs: RoleDescriptorSet): RolePolicy {
    return new CRolePolicy(roleDescs);
}

interface PermSet {
    [name: string]: string[];
}

class CRolePolicy implements RolePolicy {
    private perms: PermSet = {};
    private roles: string[];

    constructor(private roleDescs: RoleDescriptorSet) {
        // uniformization with default role and inheritance
        if (!roleDescs['default']) {
            roleDescs['default'] = {
                permissions: [],
            };
        }
        for (const role in roleDescs) {
            if (role !== 'default') {
                roleDescs[role].inherits = roleDescs[role].inherits || 'default';
            }
            this.perms[role] = getPermsForRole(roleDescs, role);
        }
        this.roles = Object.keys(roleDescs).filter((r) => r !== 'default');
    }

    public allRoles(): string[] {
        return this.roles;
    }

    public permissions(roles?: string[]): string[] {
        if (!roles || !roles.length) roles = ['default'];
        const key = roles.join('-');
        const optimistic = this.perms[key];
        if (optimistic) return optimistic;
        const newSet = getPermsForRoles(this.roleDescs, roles);
        this.perms[key] = newSet;
        return newSet;
    }
}

function getPermsForRole(roleDescs: RoleDescriptorSet, role: string): string[] {
    const rd = roleDescs[role];
    if (!rd) {
        throw new UnknownRoleError(role);
    }
    let perms = rd.permissions;
    let inherits = rd.inherits;
    while (inherits) {
        const childRd = roleDescs[inherits];
        perms = perms.concat(childRd.permissions);
        inherits = childRd.inherits;
    }
    return perms.sort().filter((p, i, a) => i === a.indexOf(p));
}

function getPermsForRoles(roleDescs: RoleDescriptorSet, roles: string[]): string[] {
    if (roles.length == 1) {
        return getPermsForRole(roleDescs, roles[0]);
    }
    const visited: string[] = [];
    let perms = [];
    for (const r of roles) {
        if (visited.includes(r)) continue;
        const rd = roleDescs[r];
        if (!rd) throw new UnknownRoleError(r);
        perms = perms.concat(rd.permissions);
        visited.push(r);
        let inherits = rd.inherits;
        while (inherits) {
            const childRd = roleDescs[inherits];
            if (!visited.includes(inherits)) {
                perms = perms.concat(childRd.permissions);
                visited.push(inherits);
            }
            inherits = childRd.inherits;
        }
    }
    return perms.sort().filter((p, i, a) => i === a.indexOf(p));
}
