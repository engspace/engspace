CREATE TABLE metadata (
    schema_version integer,
    application_id text
);

CREATE TABLE "user" (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    full_name text NOT NULL,
    updated_on timestamp NOT NULL
);

CREATE TABLE user_login (
    user_id integer PRIMARY KEY,
    password text NOT NULL,
    updated_on timestamp NOT NULL,

    FOREIGN KEY(user_id) REFERENCES "user"(id) ON DELETE CASCADE
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
    description text,
    updated_on timestamp NOT NULL
);

CREATE TABLE project_member (
    project_id integer,
    user_id integer,
    ind integer DEFAULT 0,
    leader boolean NOT NULL,
    designer boolean NOT NULL,
    updated_on timestamp NOT NULL,

    PRIMARY KEY(project_id, user_id),
    FOREIGN KEY(project_id) REFERENCES project(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES "user"(id)
);
