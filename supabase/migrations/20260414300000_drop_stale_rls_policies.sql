-- =============================================================================
-- Migration: Drop Stale Initial-Schema RLS Policies
-- Date: 2026-04-14
-- Previous sweep3 migration used wrong policy names. These are the ACTUAL
-- policy names from the initial schema that still exist alongside the new ones.
-- PostgreSQL RLS is permissive-OR, so stale policies are still evaluated.
-- =============================================================================

-- IMPORTANT: tenants_insert_authenticated has `with check (true)` which means
-- any authenticated user can insert into tenants with zero RLS restriction.
-- This must be dropped — tenant creation is handled via server action.
drop policy if exists "tenants_insert_authenticated" on tenants;

-- Stale SELECT/UPDATE policies using old get_current_tenant_id()
drop policy if exists "tenants_select_member" on tenants;
drop policy if exists "tenants_update_owner" on tenants;
drop policy if exists "tenant_users_select" on tenant_users;

-- Stale mutation policies on data tables
drop policy if exists "conversations_update" on conversations;
drop policy if exists "messages_update" on messages;
drop policy if exists "messages_delete" on messages;
drop policy if exists "shared_memory_delete" on shared_memory;
drop policy if exists "vector_documents_update" on vector_documents;
drop policy if exists "vector_documents_delete" on vector_documents;
drop policy if exists "tool_executions_update" on tool_executions;
drop policy if exists "tool_executions_delete" on tool_executions;
drop policy if exists "api_keys_update" on api_keys;
