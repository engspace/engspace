import { sql } from 'slonik';
import { expect } from 'chai';
import { pool, th, dao } from '.';

describe('#GlobalCounterDao', function () {
    afterEach(th.resetChangeCounter());
    describe('#peekChange', function () {
        it('peeks the change counter', async function () {
            await pool.transaction((db) => db.query(sql`UPDATE global_counter SET change=1234`));
            const counter = await pool.transaction((db) => {
                return dao.globalCounter.peekChange(db);
            });
            expect(counter).to.equal(1234);
        });
    });

    describe('#bumpChange', function () {
        it('bumps the change counter in parallel (transac)', async function () {
            const counts = await pool.transaction(async (db) => {
                return Promise.all([
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),

                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                ]);
            });
            const expected = [...Array(10).keys()].map((i) => i + 1);
            expect(counts).to.have.deep.members(expected);
        });
        it('bumps the change counter in parallel (connect)', async function () {
            const counts = await pool.connect(async (db) => {
                return Promise.all([
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),

                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                    dao.globalCounter.bumpChange(db),
                ]);
            });
            const expected = [...Array(10).keys()].map((i) => i + 1);
            expect(counts).to.have.deep.members(expected);
        });
    });
});
