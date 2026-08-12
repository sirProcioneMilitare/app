-- Estensioni necessarie e tipi enum condivisi.

create extension if not exists pgcrypto;

create type app_role as enum ('him', 'her');
create type booking_stato as enum ('richiesta', 'confermata', 'rifiutata', 'completata', 'annullata');
create type sos_stato as enum ('aperta', 'presa_in_carico', 'conclusa', 'scaduta');
create type redemption_stato as enum ('richiesto', 'onorato', 'scaduto');
create type daily_tipo as enum ('audio', 'testo');
