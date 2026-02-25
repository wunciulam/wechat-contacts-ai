-- Supabase SQL Schema for WeChat Contact Manager
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wxid TEXT,
  nickname TEXT NOT NULL,
  remark_name TEXT,
  remark_info TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  avatar_url TEXT,
  added_at BIGINT NOT NULL,
  last_date TEXT,
  progress_history JSONB DEFAULT '[]'::jsonb,
  deal_products JSONB DEFAULT '[]'::jsonb,
  intent_products JSONB DEFAULT '[]'::jsonb,
  follow_up_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for full access (for personal use)
CREATE POLICY "Allow full access for authenticated users" ON contacts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;

-- Create index for better performance
CREATE INDEX idx_contacts_added_at ON contacts(added_at DESC);
CREATE INDEX idx_contacts_tags ON contacts USING GIN (tags);
