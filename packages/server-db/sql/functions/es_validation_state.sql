CREATE FUNCTION es_validation_state (part_val_id uuid)
RETURNS approval_state_enum AS
$$
DECLARE
    has_reserved boolean := false;
    has_pending boolean := false;
    app_state approval_state_enum;
BEGIN
    FOR app_state IN
        SELECT state FROM part_approval
        WHERE validation_id = part_val_id
    LOOP
        CASE app_state
            WHEN 'rejected' THEN
                RETURN 'rejected';
            WHEN 'reserved' THEN
                has_reserved := true;
            WHEN 'pending' THEN
                has_pending := true;
            ELSE
                CONTINUE;
        END CASE;
    END LOOP;

    IF has_pending THEN
        RETURN 'pending';
    ELSEIF has_reserved THEN
        RETURN 'reserved';
    END IF;

    RETURN 'approved';
END
$$ LANGUAGE PLPGSQL;
