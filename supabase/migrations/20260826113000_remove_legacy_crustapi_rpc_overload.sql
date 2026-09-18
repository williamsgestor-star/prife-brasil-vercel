-- Keep one unambiguous public RPC contract for the Prospector.
-- The retained five-argument function owns reservation, provider lookup,
-- deduplication, persistence, and monthly quota settlement atomically.
drop function if exists public.run_crustapi_prospector_search(
  text,
  text,
  text,
  integer,
  integer,
  jsonb
);
