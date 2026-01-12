-- Add member_status column to track active/inactive members
ALTER TABLE public.profiles 
ADD COLUMN member_status text NOT NULL DEFAULT 'active' 
CHECK (member_status IN ('active', 'inactive'));