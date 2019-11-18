import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import morganBody from 'morgan-body';

import router from './routes';

const app = express();

app.use(express.json());
app.use(
    express.urlencoded({
        extended: false,
    })
);

if (process.env.LOG_MODE === 'full') {
    morganBody(app, {
        logReqDateTime: false,
        logReqUserAgent: false,
    });
} else if (process.env.LOG_MODE) {
    app.use(morgan(process.env.LOG_MODE));
}

app.use(cookieParser());
app.use(
    cors({
        exposedHeaders: ['Total-Count'],
    })
);
app.use('/api', router);

export { app };
