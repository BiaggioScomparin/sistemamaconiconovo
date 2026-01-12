-- Add cargo field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN cargo text;