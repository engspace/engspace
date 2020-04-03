/* eslint-disable @typescript-eslint/camelcase */
import {
    ChangeRequest,
    ChangeRequestInput,
    CycleState,
    Document,
    DocumentInput,
    DocumentRevision,
    DocumentRevisionInput,
    Part,
    PartApproval,
    PartFamily,
    PartFamilyInput,
    PartRevision,
    PartValidation,
    Project,
    ProjectInput,
    ProjectMember,
    Tracked,
    User,
    UserInput,
    ChangePartChangeInput,
    ChangePartChange,
    ChangePartCreateInput,
    ChangePartCreate,
    ChangePartRevision,
    ChangePartRevisionInput,
    ChangeReview,
} from '@engspace/core';
import { sql } from 'slonik';
import { Db, DbPool } from '.';
import {
    DaoSet,
    PartApprovalDaoInput,
    PartDaoInput,
    PartRevisionDaoInput,
    ChangeReviewDaoInput,
} from './dao';
import { RoleOptions } from './dao/user';

// for ID assertions
export const idType = 'string';

export interface Dict<T> {
    [prop: string]: T;
}

export async function asyncDictMap<InT, OutT>(
    input: Dict<InT>,
    func: (inp: InT) => Promise<OutT>
): Promise<Dict<OutT>> {
    const keyVals = await Promise.all(
        Object.entries(input).map(async ([key, inp]) => [key, await func(inp)])
    );
    return Object.fromEntries(keyVals);
}

export function dictMap<InT, OutT>(input: Dict<InT>, func: (inp: InT) => OutT): Dict<OutT> {
    const keyVals = Object.entries(input).map(([key, inp]) => [key, func(inp)]);
    return Object.fromEntries(keyVals);
}

export function trackedBy(createdBy: User, updatedBy?: User): Partial<Tracked> {
    return {
        createdBy: { id: createdBy.id },
        updatedBy: { id: updatedBy?.id ?? createdBy.id },
    };
}

export function expTrackedTime(expect: any, obj: Partial<Tracked>, maxAge = 100): void {
    const now = Date.now();
    expect(obj.createdAt).to.be.a('number');
    expect(obj.updatedAt).to.be.a('number');
    expect(obj.createdAt).to.be.gte(obj.updatedAt);
    expect(obj.createdAt)
        .to.be.lte(now)
        .and.gte(now - maxAge);
    expect(obj.updatedAt)
        .to.be.lte(now)
        .and.gte(now - maxAge);
}

interface WithDeps {
    withDeps: boolean;
}

const tableDeps = {
    user: [],
    user_login: ['user'],
    project: [],
    project_member: ['user', 'project'],
    project_member_role: ['project_member'],
    part_family: [],
    part: ['part_family', 'user'],
    part_revision: ['part', 'user'],
    part_validation: ['part_revision', 'user'],
    part_approval: ['part_validation', 'user'],
    change_request: ['user'],
    change_part_create: ['change_request', 'part_family'],
    change_part_change: ['change_request', 'part'],
    change_part_revision: ['change_request', 'part'],
    change_review: ['change_request', 'user'],
    document: ['user'],
    document_revision: ['document', 'user'],
};

/**
 * Set of helpers that makes testing easier
 */
export class TestHelpers {
    constructor(private pool: DbPool, private dao: DaoSet) {}

    cleanTable(tableName: string, withDeps: WithDeps = { withDeps: false }): () => Promise<void> {
        return this.cleanTables([tableName], withDeps);
    }

    cleanTables(
        tableNames: string[],
        { withDeps }: WithDeps = { withDeps: false }
    ): () => Promise<void> {
        return async (): Promise<void> => {
            return this.pool.transaction(async db => {
                if (!withDeps) {
                    for (const t of tableNames) {
                        await db.query(sql`DELETE FROM ${sql.identifier([t])}`);
                    }
                    return;
                }

                const counts = {};
                function traverse(t: string): void {
                    if (!counts[t]) counts[t] = 1;
                    else counts[t] += 1;
                    for (const td of tableDeps[t]) {
                        traverse(td);
                    }
                }
                for (const t of tableNames) {
                    traverse(t);
                }

                const tables = Object.keys(counts).sort((a, b) => counts[a] - counts[b]);
                for (const t of tables) {
                    await db.query(sql`DELETE FROM ${sql.identifier([t])}`);
                }
            });
        };
    }

    async createUser(
        db: Db,
        input: Partial<UserInput> = {},
        opts: Partial<RoleOptions> = {}
    ): Promise<User> {
        const name = 'user.name';
        const email = `${input.name ?? name}@engspace.net`;
        const withRoles = !!input.roles;

        return this.dao.user.create(
            db,
            {
                name,
                email,
                fullName: 'User Name',
                ...input,
            },
            {
                withRoles,
                ...opts,
            }
        );
    }

    transacUser(input: Partial<UserInput>, opts: Partial<RoleOptions> = {}): Promise<User> {
        return this.pool.transaction(db => this.createUser(db, input, opts));
    }

    createUsers(
        db: Db,
        input: Dict<Partial<UserInput>>,
        opts: Partial<RoleOptions> = {}
    ): Promise<Dict<User>> {
        return asyncDictMap(input, inp => this.createUser(db, inp, opts));
    }

    createUsersAB(db: Db): Promise<{ a: User; b: User }> {
        return this.createUsers(db, { a: { name: 'a' }, b: { name: 'b' } }) as Promise<{
            a: User;
            b: User;
        }>;
    }

    transacUsers(
        input: Dict<Partial<UserInput>>,
        opts: Partial<RoleOptions> = {}
    ): Promise<Dict<User>> {
        return this.pool.transaction(db =>
            asyncDictMap(input, inp => this.createUser(db, inp, opts))
        );
    }

    transacUsersAB(): Promise<{ a: User; b: User }> {
        return this.pool.transaction(async db => {
            return this.createUsersAB(db);
        });
    }

    createProject(db: Db, input: Partial<ProjectInput> = {}): Promise<Project> {
        const code = input.code ?? 'P';
        const name = input.name ?? `${code.toUpperCase()}`;
        const description = input.description ?? `${code.toUpperCase()} Project`;
        return this.dao.project.create(db, {
            code,
            name,
            description,
        });
    }

    transacProject(input: Partial<ProjectInput> = {}): Promise<Project> {
        return this.pool.transaction(async db => {
            return this.createProject(db, input);
        });
    }

    createProjects(db: Db, input: Dict<Partial<ProjectInput>>): Promise<Dict<Project>> {
        return asyncDictMap(input, inp => this.createProject(db, inp));
    }

    transacProjects(input: Dict<Partial<ProjectInput>>): Promise<Dict<Project>> {
        return this.pool.transaction(async db => {
            return asyncDictMap(input, inp => this.createProject(db, inp));
        });
    }

    createMember(db: Db, proj: Project, user: User, roles: string[]): Promise<ProjectMember> {
        return this.dao.projectMember.create(db, {
            projectId: proj.id,
            userId: user.id,
            roles,
        });
    }

    transacMember(proj: Project, user: User, roles: string[]): Promise<ProjectMember> {
        return this.pool.transaction(async db =>
            this.dao.projectMember.create(db, {
                projectId: proj.id,
                userId: user.id,
                roles,
            })
        );
    }

    createPartFamily(db: Db, input: Partial<PartFamilyInput> = {}): Promise<PartFamily> {
        const code = input.code ?? 'P';
        const name = input.name ?? `${code.toUpperCase()} part family`;
        return this.dao.partFamily.create(db, {
            code,
            name,
        });
    }

    createPartFamilies(db: Db, input: Dict<Partial<PartFamilyInput>>): Promise<Dict<PartFamily>> {
        return asyncDictMap(input, inp => this.createPartFamily(db, inp));
    }

    resetFamilyCounters() {
        return (): Promise<void> => {
            return this.pool.transaction(async db => {
                await db.query(sql`UPDATE part_family SET counter=0`);
            });
        };
    }

    async createPart(
        db: Db,
        family: PartFamily,
        user: User,
        input: Partial<PartDaoInput>,
        { withRev1, bumpFamCounter }: { withRev1: boolean; bumpFamCounter: boolean } = {
            withRev1: false,
            bumpFamCounter: false,
        }
    ): Promise<Part> {
        const baseRef = input.baseRef ?? (input.ref ? input.ref.substr(0, 4) : 'P001');
        const ref = input.ref ?? `${baseRef}.A`;
        const part = await this.dao.part.create(db, {
            familyId: family.id,
            baseRef,
            ref,
            designation: input.designation ?? 'Part',
            userId: user.id,
        });
        if (withRev1) {
            await this.dao.partRevision.create(db, {
                partId: part.id,
                cycleState: CycleState.Edition,
                userId: user.id,
                designation: part.designation,
            });
        }
        if (bumpFamCounter) {
            await this.dao.partFamily.bumpCounterById(db, family.id);
        }
        return part;
    }

    createPartRev(
        db: Db,
        part: Part,
        user: User,
        input: Partial<PartRevisionDaoInput> = {}
    ): Promise<PartRevision> {
        return this.dao.partRevision.create(db, {
            designation: part.designation ?? 'Part',
            cycleState: CycleState.Edition,
            ...input,
            partId: part.id,
            userId: user.id,
        });
    }

    transacPartRev(
        part: Part,
        user: User,
        input: Partial<PartRevisionDaoInput>
    ): Promise<PartRevision> {
        return this.pool.transaction(async db => {
            return this.createPartRev(db, part, user, input);
        });
    }

    createPartVal(db: Db, partRev: PartRevision, user: User): Promise<PartValidation> {
        return this.dao.partValidation.create(db, {
            partRevId: partRev.id,
            userId: user.id,
        });
    }

    createPartApproval(
        db: Db,
        partVal: PartValidation,
        assignee: User,
        user: User,
        input: Partial<PartApprovalDaoInput> = {}
    ): Promise<PartApproval> {
        return this.dao.partApproval.create(db, {
            ...input,
            validationId: partVal.id,
            assigneeId: assignee.id,
            userId: user.id,
        });
    }

    createPartApprovals(
        db: Db,
        partVal: PartValidation,
        assignees: Dict<User>,
        user: User,
        input: Partial<PartApprovalDaoInput> = {}
    ): Promise<Dict<PartApproval>> {
        return asyncDictMap(assignees, assignee =>
            this.createPartApproval(db, partVal, assignee, user, input)
        );
    }

    // Change

    async createChangeRequest(
        db: Db,
        user: User,
        input: Partial<ChangeRequestInput> = {}
    ): Promise<ChangeRequest> {
        const req = await this.dao.changeRequest.create(db, {
            description: input.description ?? null,
            userId: user.id,
        });
        if (input.partCreations) {
            req.partCreations = await Promise.all(
                input.partCreations.map(inp =>
                    this.dao.changePartCreate.create(db, {
                        requestId: req.id,
                        ...inp,
                    })
                )
            );
        }
        if (input.partChanges) {
            req.partChanges = await Promise.all(
                input.partChanges.map(inp =>
                    this.dao.changePartChange.create(db, {
                        requestId: req.id,
                        ...inp,
                    })
                )
            );
        }
        if (input.partRevisions) {
            req.partRevisions = await Promise.all(
                input.partRevisions.map(inp =>
                    this.dao.changePartRevision.create(db, {
                        requestId: req.id,
                        ...inp,
                    })
                )
            );
        }
        if (input.reviewerIds) {
            req.reviews = await Promise.all(
                input.reviewerIds.map(inp =>
                    this.dao.changeReview.create(db, {
                        requestId: req.id,
                        assigneeId: inp,
                        userId: user.id,
                    })
                )
            );
        }
        return req;
    }

    async createChangePartCreate(
        db: Db,
        request: ChangeRequest,
        family: PartFamily,
        input: Partial<ChangePartCreateInput> = {}
    ): Promise<ChangePartCreate> {
        return this.dao.changePartCreate.create(db, {
            designation: 'PART',
            version: 'A',
            ...input,
            requestId: request.id,
            familyId: family.id,
        });
    }

    async createChangePartChange(
        db: Db,
        request: ChangeRequest,
        part: Part,
        input: Partial<ChangePartChangeInput> = {}
    ): Promise<ChangePartChange> {
        return this.dao.changePartChange.create(db, {
            designation: 'PART',
            version: 'A',
            ...input,
            requestId: request.id,
            partId: part.id,
        });
    }

    async createChangePartRevision(
        db: Db,
        request: ChangeRequest,
        part: Part,
        input: Partial<ChangePartRevisionInput> = {}
    ): Promise<ChangePartRevision> {
        return this.dao.changePartRevision.create(db, {
            designation: 'PART',
            ...input,
            requestId: request.id,
            partId: part.id,
        });
    }

    async createChangeReview(
        db: Db,
        request: ChangeRequest,
        assignee: User,
        user: User,
        input: Partial<ChangeReviewDaoInput> = {}
    ): Promise<ChangeReview> {
        return this.dao.changeReview.create(db, {
            ...input,
            requestId: request.id,
            assigneeId: assignee.id,
            userId: user.id,
        });
    }

    // Documents

    async createDoc(db: Db, user: User, input: Partial<DocumentInput> = {}): Promise<Document> {
        return this.dao.document.create(
            db,
            {
                name: 'docname',
                description: 'doc description',
                initialCheckout: true,
                ...input,
            },
            user.id
        );
    }

    async createDocRev(
        db: Db,
        doc: Document,
        user: User,
        input: Partial<DocumentRevisionInput> = {}
    ): Promise<DocumentRevision> {
        return this.dao.documentRevision.create(
            db,
            {
                filename: 'file.ext',
                filesize: 1664,
                changeDescription: 'update file',
                retainCheckout: true,
                ...input,
                documentId: doc.id,
            },
            user.id
        );
    }
}
