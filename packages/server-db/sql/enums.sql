
CREATE TABLE cycle_state_enum (
    id text PRIMARY KEY,
    description text
);

INSERT INTO cycle_state_enum ( id ) VALUES
    ( 'edition' ),
    ( 'validation' ),
    ( 'release' ),
    ( 'obsolete' );
