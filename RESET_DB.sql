/*
  CAUTION: THIS SCRIPT DELETES ALL USER DATA.
  Run this in the Supabase SQL Editor to reset the system.
*/

-- 1. Delete dependent data first (Child tables)
DELETE FROM public.reviews;
DELETE FROM public.rentals;
DELETE FROM public.favorites;
DELETE FROM public.service_requests;
DELETE FROM public.partners;

-- 2. Delete cars (since they belong to owners)
DELETE FROM public.cars;

-- 3. Finally, delete the users
DELETE FROM public.users WHERE email != 'admin@velocity.com'; 
-- Kept admin if exists, or remove the WHERE clause if you want to wipe EVERYTHING.
-- If you want to wipe absolutely everyone:
-- DELETE FROM public.users;
