-- Stop with a clear message if lowercasing would merge two accounts.
DO $$
DECLARE
  dup_emails text;
  dup_usernames text;
BEGIN
  SELECT string_agg(e, ', ') INTO dup_emails
  FROM (SELECT lower("email") AS e FROM "User" GROUP BY 1 HAVING count(*) > 1) t;

  SELECT string_agg(u, ', ') INTO dup_usernames
  FROM (SELECT lower("username") AS u FROM "User" GROUP BY 1 HAVING count(*) > 1) t;

  IF dup_emails IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot lowercase emails, these collide: %. Merge or rename these users first.', dup_emails;
  END IF;
  IF dup_usernames IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot lowercase usernames, these collide: %. Merge or rename these users first.', dup_usernames;
  END IF;
END $$;

UPDATE "User" SET "email" = lower("email"), "username" = lower("username");
