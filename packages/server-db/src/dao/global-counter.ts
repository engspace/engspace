import { sql } from 'slonik';
import { Db } from '..';

export class GlobalCounterDao {
    peekChange(db: Db): Promise<number> {
        return db.oneFirst(sql`SELECT change FROM global_counter`) as Promise<number>;
    }

    bumpChange(db: Db): Promise<number> {
        return db.oneFirst(sql`
            UPDATE global_counter SET change = change+1
            RETURNING change
        `) as Promise<number>;
    }
}
