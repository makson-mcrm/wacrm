-- KM1: isolated sales activity persistence probe for ephemeral Supabase CI.
-- IMPORTANT: synthetic fixtures only; run ONLY with 'supabase db query --local'.
-- Does not call the production CRM, Supabase REST, AI or Hostinger.
-- One DO statement because 'supabase db query --file' uses a prepared statement.
-- Uses postgres owner privileges; does not claim to test authenticated RLS or browser UI.
DO $km1$
DECLARE
  test_user UUID := gen_random_uuid();
  test_account UUID := gen_random_uuid();
  test_contact UUID := gen_random_uuid();
  test_pipeline UUID := gen_random_uuid();
  test_stage UUID := gen_random_uuid();
  test_deal UUID := gen_random_uuid();
  test_activity UUID := gen_random_uuid();
  test_due TIMESTAMPTZ := '2026-10-12 10:00:00+02'::timestamptz;
  matches INT;
BEGIN
  -- All identifiers are generated inside the disposable, CI-local database.
  INSERT INTO auth.users
    (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
     created_at, updated_at)
  VALUES
    (test_user, '00000000-0000-0000-0000-000000000000'::uuid,
     'authenticated', 'authenticated',
     'km1-ci-' || replace(test_user::text, '-', '') || '@example.invalid',
     '', NOW(), NOW(), NOW());

  INSERT INTO public.accounts (id, name, owner_user_id)
    VALUES (test_account, 'KM1 synthetic account', test_user);
  INSERT INTO public.profiles
    (user_id, full_name, email, account_id, account_role)
    VALUES (test_user, 'KM1 synthetic tester', 'km1-ci@example.invalid',
            test_account, 'owner');

  INSERT INTO public.contacts
    (id, account_id, user_id, phone, name, source)
    VALUES (test_contact, test_account, test_user, '+48000111222',
            'KM1 synthetic contact', 'CI_SYNTHETIC');
  INSERT INTO public.pipelines (id, account_id, user_id, name)
    VALUES (test_pipeline, test_account, test_user, 'KM1 isolated pipeline');
  INSERT INTO public.pipeline_stages (id, pipeline_id, name, position)
    VALUES (test_stage, test_pipeline, 'KM1 isolated stage', 0);
  INSERT INTO public.deals
    (id, account_id, user_id, pipeline_id, stage_id, contact_id,
     title, value, source)
    VALUES (test_deal, test_account, test_user, test_pipeline, test_stage,
            test_contact, 'KM1 synthetic deal', 1000, 'CI_SYNTHETIC');

  -- Reproduces the relevant columns written by the existing
  -- ActivityBoard08.saveActivity() function, without sending data externally.
  INSERT INTO public.sales_activities
    (id, account_id, user_id, activity_type, activity_status, objective_type,
     contact_id, deal_id, title, description, occurred_at, completed_at,
     completed, call_result, call_channel, source, next_action, next_action_date,
     next_contact_at, next_contact_reason)
    VALUES
    (test_activity, test_account, test_user, 'telefon', 'WYKONANE',
     'NOWE_POZYSKANIE', test_contact, test_deal, 'KM1 synthetic phone call',
     'Synthetic note only', NOW(), NOW(), TRUE, 'odebral', 'telefon',
     'CI_SYNTHETIC', 'KM1 follow up', test_due, test_due, 'KM1 follow up');

  UPDATE public.contacts SET next_step = 'KM1 follow up' WHERE id = test_contact;
  UPDATE public.deals
    SET next_action = 'KM1 follow up', next_action_at = test_due
    WHERE id = test_deal;

  SELECT COUNT(*) INTO matches
    FROM public.sales_activities a
    JOIN public.contacts c ON c.id = a.contact_id AND c.account_id = a.account_id
    JOIN public.deals d ON d.id = a.deal_id AND d.account_id = a.account_id
    WHERE a.id = test_activity
      AND a.activity_type = 'telefon'
      AND a.call_result = 'odebral'
      AND a.description = 'Synthetic note only'
      AND a.next_action = 'KM1 follow up'
      AND a.next_action_date = test_due
      AND c.source = 'CI_SYNTHETIC'
      AND c.next_step = 'KM1 follow up'
      AND d.next_action = 'KM1 follow up'
      AND d.next_action_at = test_due
      AND d.contact_id = test_contact;
  IF matches <> 1 THEN
    RAISE EXCEPTION 'KM1 synthetic Contact -> Deal -> call roundtrip failed (% rows)', matches;
  END IF;

  -- Clean only the generated data on the *ephemeral local database*.
  DELETE FROM public.sales_activities WHERE id = test_activity;
  DELETE FROM public.deals WHERE id = test_deal;
  DELETE FROM public.pipeline_stages WHERE id = test_stage;
  DELETE FROM public.pipelines WHERE id = test_pipeline;
  DELETE FROM public.contacts WHERE id = test_contact;
  DELETE FROM public.profiles WHERE user_id = test_user;
  DELETE FROM public.accounts WHERE id = test_account;
  DELETE FROM auth.users WHERE id = test_user;

  RAISE NOTICE 'KM1 synthetic database persistence roundtrip PASS (not LIVE UI or RLS)';
END;
$km1$;
