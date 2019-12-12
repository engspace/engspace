import { createDbPool, initSchema } from '@engspace/server-db';
import { buildGqlApp } from '@engspace/server-graphql';
import config from 'config';
import events from 'events';

events.EventEmitter.defaultMaxListeners = 100;

createDbPool(config.get('db'))
    .then(async pool => {
        await pool.transaction(db => initSchema(db));
        return pool;
    })
    .then(async pool => {
        const { port } = config.get('server');
        const app = await buildGqlApp(pool);
        app.listen(port, () => {
            console.log(`API listening to port ${port}`);
        });
    })
    .catch(err => {
        console.error('error during the demo app');
        console.error(err);
    });
