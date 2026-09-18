DO $migration$
DECLARE target regprocedure; definition text;
BEGIN
 FOREACH target IN ARRAY ARRAY['public.get_prospector_quota()'::regprocedure,'public.consume_prospector_leads(integer)'::regprocedure] LOOP
  definition := pg_get_functiondef(target);
  IF position('resolved_limit := coalesce(resolved_limit, 100);' in definition)=0 THEN RAISE EXCEPTION 'Unexpected quota definition'; END IF;
  definition := replace(definition,'resolved_limit := coalesce(resolved_limit, 100);','resolved_limit := case when private.is_platform_admin() then null else 100 end;');
  IF target='public.consume_prospector_leads(integer)'::regprocedure THEN
   definition := replace(definition,'greatest(0, resolved_limit - resolved_used),','case when resolved_limit is null then p_requested_count else greatest(0, resolved_limit - resolved_used) end,');
   -- The response uses NULL for unlimited, independently of the reservation count.
   definition := replace(definition,'         case when resolved_limit is null then p_requested_count else greatest(0, resolved_limit - resolved_used) end,','         case when resolved_limit is null then null else greatest(0, resolved_limit - resolved_used) end,');
  ELSE
   definition := replace(definition,'greatest(0, resolved_limit - resolved_used),','case when resolved_limit is null then null else greatest(0, resolved_limit - resolved_used) end,');
  END IF;
  EXECUTE definition;
 END LOOP;
END;
$migration$;
