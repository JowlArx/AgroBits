create extension if not exists pg_net;

alter table public.alerts
  add column if not exists last_notified_at timestamptz;

create table if not exists public.app_config (
  key text primary key,
  value text not null
);

alter table public.app_config enable row level security;

insert into public.app_config (key, value)
values ('push_cron_secret', gen_random_uuid()::text)
on conflict (key) do nothing;

create or replace function notify_alert_created()
returns trigger
language plpgsql
security definer
as \$\$
declare
  v_secret text;
begin
  select value into v_secret from public.app_config where key = 'push_cron_secret';
  perform net.http_post(
    url := 'https://fxiukidjxdcsrhyiphmu.supabase.co/functions/v1/notificar-alertas',
    body := jsonb_build_object('alert_id', NEW.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret)
  );
  return NEW;
end;
\$\$;

drop trigger if exists alert_created_notify on public.alerts;
create trigger alert_created_notify
after insert on public.alerts
for each row
execute function notify_alert_created();

select cron.schedule(
  'reenviar-alertas-pendientes',
  '0 */3 * * *',
  \$\$
    select net.http_post(
      url := 'https://fxiukidjxdcsrhyiphmu.supabase.co/functions/v1/notificar-alertas',
      body := '{}'::jsonb,
      headers := (select jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', value) from public.app_config where key = 'push_cron_secret')
    );
  \$\$
);
