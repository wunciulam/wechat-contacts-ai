-- Run only after the SMTP connection has been verified and CRON_SECRET has
-- been stored in Supabase Vault as insurance_renewal_cron_secret.
-- Enable pg_cron and pg_net in Supabase first. This script is not auto-run.
-- Keep RENEWAL_SCHEDULER_READY unset until a scheduled request is verified.
select cron.schedule(
  'insurance-renewal-digest',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://insurance-rose-seven.vercel.app/api/renewal-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'insurance_renewal_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
-- Pause: select cron.unschedule('insurance-renewal-digest');
-- Inspect cron.job_run_details and net._http_response for request outcomes.
