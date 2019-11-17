CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "user" (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    full_name text NOT NULL,
    admin boolean NOT NULL DEFAULT FALSE,
    manager boolean NOT NULL DEFAULT FALSE,
    password text,
    updated_on timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS project (
    id serial PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    description text,
    updated_on timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS project_member (
    project_id integer REFERENCES project(id),
    user_id integer REFERENCES "user"(id),
    ind integer DEFAULT 0,
    leader boolean NOT NULL,
    designer boolean NOT NULL,
    updated_on timestamp NOT NULL,
    PRIMARY KEY(project_id, user_id)
);
