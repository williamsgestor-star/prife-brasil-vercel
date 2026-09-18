create index if not exists crm_lead_events_lead_id_idx
  on public.crm_lead_events (lead_id);

create index if not exists crm_lead_events_actor_user_id_idx
  on public.crm_lead_events (actor_user_id)
  where actor_user_id is not null;
