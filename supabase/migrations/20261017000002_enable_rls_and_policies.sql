-- T-20 — enable_rls_and_policies (aplicada el 17/10/2026 vía MCP de Supabase)
-- RLS en TODAS las tablas (plan.md §4.1). Principio de minimo privilegio:
-- solo filas propias; herencia de umbrales/alertas via cultivo y de
-- mediciones via sensor. El catalogo es de solo lectura para clientes (la
-- edicion del usuario vive en los umbrales de su propio cultivo, D3).
-- Todas las politicas son `to authenticated`: el rol anon queda sin ninguna
-- politica aplicable (denegacion por defecto pese a los grants).

alter table public.crops enable row level security;
alter table public.crop_thresholds enable row level security;
alter table public.sensors enable row level security;
alter table public.sensor_crop enable row level security;
alter table public.measurements enable row level security;
alter table public.alerts enable row level security;
alter table public.crop_type_catalog enable row level security;

-- crops: dueño directo (R-02/R-04)
create policy "crops_select_own" on public.crops
  for select to authenticated using (auth.uid() = user_id);
create policy "crops_insert_own" on public.crops
  for insert to authenticated with check (auth.uid() = user_id);
create policy "crops_update_own" on public.crops
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "crops_delete_own" on public.crops
  for delete to authenticated using (auth.uid() = user_id);

-- crop_thresholds: herencia via cultivo (R-05)
create policy "crop_thresholds_select_own" on public.crop_thresholds
  for select to authenticated
  using (exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid()));
create policy "crop_thresholds_insert_own" on public.crop_thresholds
  for insert to authenticated
  with check (exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid()));
create policy "crop_thresholds_update_own" on public.crop_thresholds
  for update to authenticated
  using (exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid()));
create policy "crop_thresholds_delete_own" on public.crop_thresholds
  for delete to authenticated
  using (exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid()));

-- sensors: dueño directo (R-06)
create policy "sensors_select_own" on public.sensors
  for select to authenticated using (auth.uid() = user_id);
create policy "sensors_insert_own" on public.sensors
  for insert to authenticated with check (auth.uid() = user_id);
create policy "sensors_update_own" on public.sensors
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sensors_delete_own" on public.sensors
  for delete to authenticated using (auth.uid() = user_id);

-- sensor_crop: ambas partes propias (base de R-07)
create policy "sensor_crop_select_own" on public.sensor_crop
  for select to authenticated
  using (
    exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid())
    and exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid())
  );
create policy "sensor_crop_insert_own" on public.sensor_crop
  for insert to authenticated
  with check (
    exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid())
    and exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid())
  );
create policy "sensor_crop_update_own" on public.sensor_crop
  for update to authenticated
  using (
    exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid())
    and exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid())
    and exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid())
  );
create policy "sensor_crop_delete_own" on public.sensor_crop
  for delete to authenticated
  using (
    exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid())
    and exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid())
  );

-- measurements: herencia via sensor (R-08/R-09)
create policy "measurements_select_own" on public.measurements
  for select to authenticated
  using (exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid()));
create policy "measurements_insert_own" on public.measurements
  for insert to authenticated
  with check (exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid()));
create policy "measurements_update_own" on public.measurements
  for update to authenticated
  using (exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid()));
create policy "measurements_delete_own" on public.measurements
  for delete to authenticated
  using (exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid()));

-- alerts: herencia via cultivo (R-13/R-14)
create policy "alerts_select_own" on public.alerts
  for select to authenticated
  using (exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid()));
create policy "alerts_insert_own" on public.alerts
  for insert to authenticated
  with check (exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid()));
create policy "alerts_update_own" on public.alerts
  for update to authenticated
  using (exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid()));
create policy "alerts_delete_own" on public.alerts
  for delete to authenticated
  using (exists (select 1 from public.crops c where c.id = crop_id and c.user_id = auth.uid()));

-- crop_type_catalog: referencia orientativa de solo lectura (D3, R-11)
create policy "crop_type_catalog_read" on public.crop_type_catalog
  for select to authenticated using (true);
