INSERT INTO global_counter (change_request)
    VALUES (0);

INSERT INTO part_cycle_enum (id) VALUES
    ('EDITION'),
    ('VALIDATION'),
    ('RELEASE'),
    ('OBSOLETE'),
    ('CANCELLED');

INSERT INTO validation_result_enum (id) VALUES
    ('RELEASE'),
    ('TRY_AGAIN'),
    ('CANCEL');

INSERT INTO change_request_cycle_enum (id) VALUES
    ('EDITION'),
    ('VALIDATION'),
    ('APPROVED'),
    ('CANCELLED');
