CREATE FUNCTION es_change_state (ch_id integer, cycle text)
RETURNS approval_decision_enum AS
$$
DECLARE
    has_reserved boolean := false;
    has_pending boolean := false;
    app_state approval_decision_enum;
BEGIN
    IF cycle = 'PREPARATION' THEN
        RETURN NULL;
    END IF;

    FOR app_state IN
        SELECT decision FROM change_review
        WHERE change_id = ch_id
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
