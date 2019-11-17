import events from 'events';
import config from 'config';
import { app } from '@engspace/server-api/dist/app';
import { Pool } from '@engspace/server-api/dist/db';
import { createSchema } from '@engspace/server-api/dist/db/schema';
import { populateDemo } from '@engspace/demo-data';

events.EventEmitter.defaultMaxListeners = 100;

Pool.create(config.db);

createSchema({ preserve: false })
    .then(() => populateDemo())
    .then(() => {
        const { port } = config.server;
        app.listen(port, () => {
            console.log(`Demo API listening to port ${port}`);
        });
    });
