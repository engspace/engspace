import { Id, PartFamily, PartFamilyInput } from '@engspace/core';
import { DaoSet } from '@engspace/server-db';
import { assertUserPerm } from './helpers';
import { ApiContext } from '.';

export class PartFamilyControl {
    constructor(private dao: DaoSet) {}

    async create(ctx: ApiContext, partFamily: PartFamilyInput): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.create');
        return this.dao.partFamily.create(ctx.db, partFamily);
    }

    async byId(ctx: ApiContext, id: Id): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.read');
        return this.dao.partFamily.byId(ctx.db, id);
    }

    async update(ctx: ApiContext, id: Id, partFamily: PartFamilyInput): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.update');
        return this.dao.partFamily.updateById(ctx.db, id, partFamily);
    }
}
