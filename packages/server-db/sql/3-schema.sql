CREATE TABLE metadata (
    schema_version integer,
    application_id text
);

CREATE TABLE global_counter (
    change_request integer NOT NULL
);

CREATE TABLE "user" (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    full_name text NOT NULL
);

CREATE TABLE user_role (
    user_id integer,
    role text NOT NULL,

    PRIMARY KEY(user_id, role),
    FOREIGN KEY(user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE project (
    id serial PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    description text
);

CREATE TABLE project_member (
    id serial PRIMARY KEY,
    project_id integer NOT NULL,
    user_id integer NOT NULL,

    UNIQUE(project_id, user_id),
    FOREIGN KEY(project_id) REFERENCES project(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES "user"(id)
);

CREATE TABLE project_member_role (
    member_id integer NOT NULL,
    role text NOT NULL,

    PRIMARY KEY(member_id, role),
    FOREIGN KEY(member_id) REFERENCES project_member(id)
            ON DELETE CASCADE
);

CREATE TABLE part_family (
    id serial PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL,
    counter integer NOT NULL DEFAULT 0
);

CREATE TABLE change_request (
    id serial PRIMARY KEY,
    name text NOT NULL,
    description text,
    cycle text NOT NULL,

    created_by integer NOT NULL,
    created_at timestamptz NOT NULL,
    updated_by integer NOT NULL,
    updated_at timestamptz NOT NULL,

    UNIQUE(name),
    CHECK(LENGTH(name) > 0),

    FOREIGN KEY(cycle) REFERENCES change_request_cycle_enum(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id),
    FOREIGN KEY(updated_by) REFERENCES "user"(id)
);

CREATE TABLE part (
    id serial PRIMARY KEY,
    family_id integer NOT NULL,
    ref text NOT NULL,
    designation text NOT NULL,

    created_by integer NOT NULL,
    created_at timestamptz NOT NULL,
    updated_by integer NOT NULL,
    updated_at timestamptz NOT NULL,

    UNIQUE(ref),
    CHECK(LENGTH(ref) > 0),
    CHECK(LENGTH(designation) > 0),

    FOREIGN KEY(family_id) REFERENCES part_family(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id),
    FOREIGN KEY(updated_by) REFERENCES "user"(id)
);

CREATE TABLE part_revision (
    id serial PRIMARY KEY,
    part_id integer NOT NULL,

    revision integer NOT NULL,
    designation text NOT NULL,

    change_request_id integer NOT NULL,

    cycle text NOT NULL,

    created_by integer NOT NULL,
    created_at timestamptz NOT NULL,
    updated_by integer NOT NULL,
    updated_at timestamptz NOT NULL,

    CHECK(revision > 0),
    CHECK(LENGTH(designation) > 0),

    FOREIGN KEY(part_id) REFERENCES part(id),
    FOREIGN KEY(change_request_id) REFERENCES change_request(id),
    FOREIGN KEY(cycle) REFERENCES part_cycle_enum(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id),
    FOREIGN KEY(updated_by) REFERENCES "user"(id)
);

CREATE TABLE part_validation (
    id serial PRIMARY KEY,
    part_rev_id integer NOT NULL,
    result text,
    comments text,

    created_by integer NOT NULL,
    created_at timestamptz NOT NULL,
    updated_by integer NOT NULL,
    updated_at timestamptz NOT NULL,

    FOREIGN KEY(part_rev_id) REFERENCES part_revision(id),
    FOREIGN KEY(result) REFERENCES validation_result_enum(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id),
    FOREIGN KEY(updated_by) REFERENCES "user"(id)
);

CREATE TABLE part_approval (
    id serial PRIMARY KEY,
    validation_id integer NOT NULL,
    assignee_id integer NOT NULL,
    decision approval_decision_enum NOT NULL,
    comments text,

    created_by integer NOT NULL,
    created_at timestamptz NOT NULL,
    updated_by integer NOT NULL,
    updated_at timestamptz NOT NULL,

    FOREIGN KEY(validation_id) REFERENCES part_validation(id),
    FOREIGN KEY(assignee_id) REFERENCES "user"(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id),
    FOREIGN KEY(updated_by) REFERENCES "user"(id)
);

CREATE TABLE change_part_create (
    id serial PRIMARY KEY,
    request_id integer NOT NULL,
    family_id integer NOT NULL,
    version text NOT NULL,
    designation text NOT NULL,
    comments text,

    CHECK(LENGTH(version) > 0),
    CHECK(LENGTH(designation) > 0),

    FOREIGN KEY(request_id) REFERENCES change_request(id),
    FOREIGN KEY(family_id) REFERENCES part_family(id)
);

CREATE TABLE change_part_fork (
    id serial PRIMARY KEY,
    request_id integer NOT NULL,
    part_id integer NOT NULL,
    version text NOT NULL,
    designation text,
    comments text,

    CHECK(LENGTH(version) > 0),

    FOREIGN KEY(request_id) REFERENCES change_request(id),
    FOREIGN KEY(part_id) REFERENCES part(id)
);

CREATE TABLE change_part_revision (
    id serial PRIMARY KEY,
    request_id integer NOT NULL,
    part_id integer NOT NULL,
    designation text,
    comments text,

    FOREIGN KEY(request_id) REFERENCES change_request(id),
    FOREIGN KEY(part_id) REFERENCES part(id)
);

CREATE TABLE change_review (
    id serial PRIMARY KEY,
    request_id integer NOT NULL,
    assignee_id integer NOT NULL,
    decision approval_decision_enum NOT NULL,
    comments text,

    created_by integer NOT NULL,
    created_at timestamptz NOT NULL,
    updated_by integer NOT NULL,
    updated_at timestamptz NOT NULL,

    FOREIGN KEY(request_id) REFERENCES change_request(id),
    FOREIGN KEY(assignee_id) REFERENCES "user"(id)
);

CREATE TABLE document (
    id serial PRIMARY KEY,
    name text NOT NULL,
    description text,
    created_by integer NOT NULL,
    created_at timestamptz NOT NULL,
    checkout integer,

    FOREIGN KEY(created_by) REFERENCES "user"(id),
    FOREIGN KEY(checkout) REFERENCES "user"(id)
);

CREATE TABLE document_revision (
    id serial PRIMARY KEY,
    document_id integer NOT NULL,
    revision integer NOT NULL,
    filename text NOT NULL,
    filesize integer NOT NULL,
    created_by integer NOT NULL,
    created_at timestamptz NOT NULL,
    change_description text,

    uploaded integer NOT NULL DEFAULT 0,
    sha1 bytea, -- initially null, set after check on both client and server

    CHECK(filesize > 0),
    CHECK(uploaded >= 0 AND uploaded <= filesize),
    UNIQUE(document_id, revision),
    FOREIGN KEY(document_id) REFERENCES document(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id)
);
