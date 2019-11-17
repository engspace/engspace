import events from 'events';
import config from 'config';
import { app } from '@engspace/server-routes';
import { Pool } from '@engspace/server-db';
import { createSchema } from '@engspace/server-db';

events.EventEmitter.defaultMaxListeners = 100;

Pool.create(config.get('db'));

createSchema({ preserve: true }).then(() => {
    const { port } = config.get('server');
    app.listen(port, () => {
        console.log(`API listening to port ${port}`);
    });
});
