import events from 'events';
import config from 'config';
import { app } from '@engspace/server-routes';
import { Pool, createSchema } from '@engspace/server-db';
import { populateDemo } from '@engspace/demo-data';

events.EventEmitter.defaultMaxListeners = 100;

Pool.create(config.get('db'));

createSchema({ preserve: false })
    .then(() => populateDemo())
    .then(() => {
        const { port } = config.get('server');
        app.listen(port, () => {
            console.log(`Demo API listening to port ${port}`);
        });
    });
