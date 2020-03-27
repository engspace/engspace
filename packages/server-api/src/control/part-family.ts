import { Id, PartFamily, PartFamilyInput } from '@engspace/core';
import { partFamilyDao } from '@engspace/server-db';
import { ApiContext } from '.';
import { assertUserPerm } from './helpers';

export class PartFamilyControl {
    async create(ctx: ApiContext, partFamily: PartFamilyInput): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.create');
        return partFamilyDao.create(ctx.db, partFamily);
    }

    async byId(ctx: ApiContext, id: Id): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.read');
        return partFamilyDao.byId(ctx.db, id);
    }

    async update(ctx: ApiContext, id: Id, partFamily: PartFamilyInput): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.update');
        return partFamilyDao.updateById(ctx.db, id, partFamily);
    }
}
