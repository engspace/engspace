CREATE TABLE metadata (
    schema_version integer,
    application_id text
);

CREATE TABLE "user" (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v1mc(),
    name text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    full_name text NOT NULL,
    updated_on timestamp NOT NULL
);

CREATE TABLE user_login (
    user_id uuid PRIMARY KEY,
    password text NOT NULL,
    updated_on timestamp NOT NULL,

    FOREIGN KEY(user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE user_role (
    user_id uuid,
    role text NOT NULL,

    PRIMARY KEY(user_id, role),
    FOREIGN KEY(user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE project (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v1mc(),
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    description text,
    updated_on timestamp NOT NULL
);

CREATE TABLE project_member (
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    updated_on timestamp NOT NULL,

    PRIMARY KEY(project_id, user_id),
    FOREIGN KEY(project_id) REFERENCES project(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES "user"(id)
);

CREATE TABLE project_member_role (
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,

    PRIMARY KEY(project_id, user_id, role),
    FOREIGN KEY(project_id, user_id) REFERENCES project_member(project_id, user_id)
            ON DELETE CASCADE
)
