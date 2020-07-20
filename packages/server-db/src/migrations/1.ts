import { sqlOperation, esTreeSqlPath } from '../migration';

export default {
    level: 1,
    promote: [
        sqlOperation.file({ path: esTreeSqlPath('1/1-extensions.sql'), stmtSplit: ';' }),
        sqlOperation.file({ path: esTreeSqlPath('1/2-bases.sql'), stmtSplit: ';' }),
        sqlOperation.file({ path: esTreeSqlPath('1/3-schema.sql'), stmtSplit: ';' }),
        sqlOperation.folder({ path: esTreeSqlPath('1/4-functions'), recursive: false }),
        sqlOperation.file({ path: esTreeSqlPath('1/5-populate.sql'), stmtSplit: ';' }),
    ],
    demote: [],
};
