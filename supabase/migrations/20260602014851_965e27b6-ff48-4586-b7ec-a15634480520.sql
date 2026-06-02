-- Adiciona os novos valores ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'commercial_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_assistant';