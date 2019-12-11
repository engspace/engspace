import config from 'config';
import events from 'events';
import _ from 'lodash';
import { createDbPool, DbConfig, DbPool } from '../src';

events.EventEmitter.defaultMaxListeners = 100;

export let pool: DbPool;

export function filterFields(obj: any, field: string): any {
    const res = _.cloneDeep(obj);
    delete res[field];
    return res;
}

before('db setup', async function() {
    this.timeout(5000);

    const dbConf: DbConfig = config.get('db');
    console.log('starting tests with Db config:', dbConf);
    pool = await createDbPool(dbConf);
});
