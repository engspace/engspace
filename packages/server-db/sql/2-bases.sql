
CREATE TABLE metadata (
    schema_version integer,
    application_id text
);

CREATE TABLE global_counter (
    change_request integer NOT NULL
);

CREATE TABLE part_cycle_enum (
    id text PRIMARY KEY,
    description text
);

CREATE TABLE validation_result_enum (
    id text PRIMARY KEY,
    description text
);

CREATE TABLE change_request_cycle_enum (
    id text PRIMARY KEY,
    description text
);

-- this enum is better hard coded because used in functions
CREATE TYPE approval_decision_enum AS ENUM (
    'PENDING',
    'REJECTED',
    'RESERVED',
    'APPROVED'
);
