-- mCRM 4.0 — prevent anonymous RPC execution of internal SECURITY DEFINER functions.
-- Public invitation preview and is_account_member remain executable because
-- they are used before/inside authentication and RLS flows.

revoke execute on function public._bcast_bump(uuid,text,integer) from anon;
revoke execute on function public.broadcast_recipient_aggregate_trigger() from anon;
revoke execute on function public.claim_ai_reply_slot(uuid,integer) from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.notify_conversation_assigned() from anon;
revoke execute on function public.recompute_broadcast_counts(uuid) from anon;
revoke execute on function public.record_webhook_failure(uuid,integer) from anon;
revoke execute on function public.touch_presence(text) from anon;
