import events from 'events';
import config from 'config';
import { app } from '@engspace/server-routes';
import { Pool } from '@engspace/server-db';
import { populateDemo } from '@engspace/demo-data';

events.EventEmitter.defaultMaxListeners = 100;

Pool.init(config.get('db'))
    .then(() => populateDemo())
    .then(() => {
        const { port } = config.get('server');
        app.listen(port, () => {
            console.log(`Demo API listening to port ${port}`);
        });
    });
