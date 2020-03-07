import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiShallowDeepEqual from 'chai-shallow-deep-equal';
import chaiUuid from 'chai-uuid';
import events from 'events';
import _ from 'lodash';
import {
    connectionString,
    createDbPool,
    DbPool,
    DbPoolConfig,
    initSchema,
    prepareDb,
} from '../src';

chai.use(chaiShallowDeepEqual);
chai.use(chaiUuid);
chai.use(chaiAsPromised);

const { expect } = chai;

events.EventEmitter.defaultMaxListeners = 100;

export function filterFields(obj: any, field: string): any {
    const res = _.cloneDeep(obj);
    delete res[field];
    return res;
}

export const dbConfig: DbPoolConfig = {
    user: process.env.DB_USER || 'postgres',
    pass: process.env.DB_PASS || 'postgres',
    port: process.env.DB_PORT || 5432,
    netloc: process.env.DB_NETLOC || 'localhost',
    name: process.env.DB_NAME || 'engspace_server_db_test',
    slonikOptions: {
        idleTimeout: 1000,
    },
};

export const pool: DbPool = createDbPool(dbConfig);

before('db setup', async function() {
    this.timeout(5000);

    console.log('starting tests with Db config:', dbConfig);
    await prepareDb({ ...dbConfig, formatDb: true });
    await pool.transaction(db => initSchema(db));
});

describe('#connectionString', function() {
    it('should build default connection string', function() {
        expect(connectionString({})).to.equal('postgresql://localhost');
    });
    it('should create connection string with location', function() {
        expect(connectionString({ netloc: 'location.net' })).to.equal('postgresql://location.net');
    });
    it('should create connection string with user and location', function() {
        expect(connectionString({ user: 'user.name', netloc: 'location.net' })).to.equal(
            'postgresql://user.name@location.net'
        );
    });
    it('should create connection string with user, password and location', function() {
        expect(
            connectionString({ user: 'user.name', pass: 'password', netloc: 'location.net' })
        ).to.equal('postgresql://user.name:password@location.net');
    });
    it('should create connection string with user, password, location and port', function() {
        expect(
            connectionString({
                user: 'user.name',
                pass: 'password',
                netloc: 'location.net',
                port: 5555,
            })
        ).to.equal('postgresql://user.name:password@location.net:5555');
        expect(
            connectionString({
                user: 'user.name',
                pass: 'password',
                netloc: 'location.net',
                port: '5555',
            })
        ).to.equal('postgresql://user.name:password@location.net:5555');
    });
    it('should create full connection', function() {
        expect(
            connectionString({
                user: 'user.name',
                pass: 'password',
                netloc: 'location.net',
                port: 5555,
                name: 'db_name',
            })
        ).to.equal('postgresql://user.name:password@location.net:5555/db_name');
    });
    it('should throw if supplying password without username', function() {
        function bad(): string {
            return connectionString({
                pass: 'secret',
                netloc: 'location.net',
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
