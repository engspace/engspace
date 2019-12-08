import events from 'events';
import config from 'config';
import { buildGqlApp } from '@engspace/server-graphql';
import { createDbPool } from '@engspace/server-db';
import { populateDemo } from '@engspace/demo-data';

events.EventEmitter.defaultMaxListeners = 100;

createDbPool(config.get('db'))
    .then(async pool => {
        await populateDemo(pool);
        return pool;
    })
    .then(async pool => {
        const { port } = config.get('server');
        const app = await buildGqlApp(pool);
        app.listen(port, () => {
            console.log(`Demo API listening to port ${port}`);
        });
    })
    .catch(err => {
        console.error('error during the demo app');
        console.error(err);
    });
