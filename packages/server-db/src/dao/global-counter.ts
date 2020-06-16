import { sql } from 'slonik';
import { Db } from '..';

export class GlobalCounterDao {
    peekChangeRequest(db: Db): Promise<number> {
        return db.oneFirst(sql`SELECT change_request FROM global_counter`) as Promise<number>;
    }

    bumpChangeRequest(db: Db): Promise<number> {
        return db.oneFirst(sql`
            UPDATE global_counter SET change_request = change_request+1
            RETURNING change_request
        `) as Promise<number>;
    }
}
