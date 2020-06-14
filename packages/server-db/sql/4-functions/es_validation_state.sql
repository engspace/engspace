CREATE FUNCTION es_validation_state (part_val_id integer)
RETURNS approval_decision_enum AS
$$
DECLARE
    has_reserved boolean := false;
    has_pending boolean := false;
    app_state approval_decision_enum;
BEGIN
    FOR app_state IN
        SELECT decision FROM part_approval
        WHERE validation_id = part_val_id
    LOOP
        CASE app_state
            WHEN 'REJECTED' THEN
                RETURN 'REJECTED';
            WHEN 'RESERVED' THEN
                has_reserved := true;
            WHEN 'PENDING' THEN
                has_pending := true;
            ELSE
                CONTINUE;
        END CASE;
    END LOOP;

    IF has_pending THEN
        RETURN 'PENDING';
    ELSEIF has_reserved THEN
        RETURN 'RESERVED';
    END IF;

    RETURN 'APPROVED';
END
$$ LANGUAGE PLPGSQL;
