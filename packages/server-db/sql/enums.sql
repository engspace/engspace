
CREATE TABLE cycle_state_enum (
    id text PRIMARY KEY,
    description text
);

CREATE TABLE validation_result_enum (
    id text PRIMARY KEY,
    description text
);

-- this enum is better hard coded because used in es_validation_state
CREATE TYPE approval_state_enum AS ENUM (
    'PENDING',
    'REJECTED',
    'RESERVED',
    'APPROVED'
);
