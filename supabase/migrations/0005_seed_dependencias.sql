-- =============================================================================
-- SEED: DEPENDENCIAS INICIALES (Gerencia y Nomina)
-- =============================================================================
-- Ejecutalo despues de 0001_initial_schema.sql (y antes o despues del bootstrap).
-- Idempotente: si ya existen, no las duplica.
-- =============================================================================

insert into public.dependencias (nombre, descripcion)
values
    (
        'Gerencia',
        'Area gerencial; recibe, revisa y aprueba informes de otras dependencias'
    ),
    (
        'Nomina',
        'Dependencia de nomina; crea y envia informes y documentacion'
    )
on conflict (nombre) do nothing;
