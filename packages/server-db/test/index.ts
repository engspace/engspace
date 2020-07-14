import events from 'events';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiShallowDeepEqual from 'chai-shallow-deep-equal';
import chaiSubset from 'chai-subset';
import _ from 'lodash';
import { passwordLogin } from '../src';
import {
    buildDaoSet,
    connectionString,
    createDbPool,
    DbConnConfig,
    DbPool,
    DbPoolConfig,
    DbPreparationConfig,
    initSchema,
    prepareDb,
    ServerConnConfig,
} from '../src';
import { TestHelpers } from '../src/test-helpers';

chai.use(chaiShallowDeepEqual);
chai.use(chaiAsPromised);
chai.use(chaiSubset);

const { expect } = chai;

events.EventEmitter.defaultMaxListeners = 100;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function filterFields(obj: any, field: string): any {
    const res = _.cloneDeep(obj);
    delete res[field];
    return res;
}

export const config = {
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: process.env.DB_PORT,
    dbUser: process.env.DB_USER || 'postgres',
    dbPass: process.env.DB_PASS || 'postgres',
};

export const serverConnConfig: ServerConnConfig = {
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    pass: config.dbPass,
};

const dbConnConfig: DbConnConfig = {
    ...serverConnConfig,
    name: 'engspace_server_db_test',
};

const dbPreparationConfig: DbPreparationConfig = {
    serverConnString: connectionString(serverConnConfig),
    name: dbConnConfig.name,
    formatDb: true,
};

const dbPoolConfig: DbPoolConfig = {
    dbConnString: connectionString(dbConnConfig),
    slonikOptions: {
        idleTimeout: 1000,
        captureStackTrace: true,
    },
};

export const pool: DbPool = createDbPool(dbPoolConfig);
export const dao = buildDaoSet();
export const th = new TestHelpers(pool, dao);

before('db setup', async function () {
    this.timeout(5000);

    await prepareDb(dbPreparationConfig);
    await pool.transaction(async (db) => {
        await initSchema(db);
        await passwordLogin.buildSchema(db);
    });
});

describe('#connectionString', function () {
    it('should build default connection string', function () {
        expect(connectionString({})).to.equal('postgresql://localhost');
    });
    it('should create connection string with location', function () {
        expect(connectionString({ host: 'location.net' })).to.equal('postgresql://location.net');
    });
    it('should create connection string with user and location', function () {
        expect(connectionString({ user: 'user.name', host: 'location.net' })).to.equal(
            'postgresql://user.name@location.net'
        );
    });
    it('should create connection string with user, password and location', function () {
        expect(
            connectionString({ user: 'user.name', pass: 'password', host: 'location.net' })
        ).to.equal('postgresql://user.name:password@location.net');
    });
    it('should create connection string with user, password, location and port', function () {
        expect(
            connectionString({
                user: 'user.name',
                pass: 'password',
                host: 'location.net',
                port: 5555,
            })
        ).to.equal('postgresql://user.name:password@location.net:5555');
        expect(
            connectionString({
                user: 'user.name',
                pass: 'password',
                host: 'location.net',
                port: '5555',
            })
        ).to.equal('postgresql://user.name:password@location.net:5555');
    });
    it('should create full connection', function () {
        expect(
            connectionString({
                user: 'user.name',
                pass: 'password',
                host: 'location.net',
                port: 5555,
                name: 'db_name',
            })
        ).to.equal('postgresql://user.name:password@location.net:5555/db_name');
    });
    it('should throw if supplying password without username', function () {
        function bad(): string {
            return connectionString({
                pass: 'secret',
                host: 'location.net',
                port: 5555,
                name: 'db_name',
            });
        }
        expect(bad).to.throw();
        try {
            bad();
        } catch (err) {
            expect(err.message.toLowerCase()).to.contain('password');
            expect(err.message).to.not.contain('secret');
            expect(err.message).to.not.contain('location.net');
            expect(err.message).to.not.contain('5555');
            expect(err.message).to.not.contain('db_name');
        }
    });
});
