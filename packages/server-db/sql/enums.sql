
CREATE TABLE cycle_state_enum (
    id integer PRIMARY KEY,
    name text NOT NULL,
    description text,

    UNIQUE(name)
);

INSERT INTO cycle_state_enum ( id, name) VALUES
    ( 0, 'edition' ),
    ( 1, 'validation' ),
    ( 2, 'release' ),
    ( 3, 'obsolete' );
