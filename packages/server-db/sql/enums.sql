
CREATE TABLE cycle_state_enum (
    id text PRIMARY KEY,
    description text
);

CREATE TABLE validation_result_enum (
    id text PRIMARY KEY,
    description text
);

CREATE TYPE approval_state_enum AS ENUM (
    'PENDING',
    'REJECTED',
    'RESERVED',
    'APPROVED'
);
