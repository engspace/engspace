import { Id, PartFamily, PartFamilyInput } from '@engspace/core';
import { assertUserPerm } from './helpers';
import { EsContext } from '.';

export class PartFamilyControl {
    async create(ctx: EsContext, partFamily: PartFamilyInput): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.create');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.partFamily.create(db, partFamily);
    }

    async byId(ctx: EsContext, id: Id): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.read');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.partFamily.byId(db, id);
    }

    async update(ctx: EsContext, id: Id, partFamily: PartFamilyInput): Promise<PartFamily> {
        assertUserPerm(ctx, 'partfamily.update');
        const {
            db,
            runtime: { dao },
        } = ctx;
        return dao.partFamily.updateById(db, id, partFamily);
    }
}
