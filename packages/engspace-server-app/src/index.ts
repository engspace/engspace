import events from 'events';
import config from 'config';
import { app } from '@engspace/server-api/dist/app';
import { Pool } from '@engspace/server-api/dist/db';
import { createSchema } from '@engspace/server-api/dist/db/schema';

events.EventEmitter.defaultMaxListeners = 100;

Pool.create(config.db);

createSchema({ preserve: true }).then(() => {
    const { port } = config.server;
    app.listen(port, () => {
        console.log(`API listening to port ${port}`);
    });
});
