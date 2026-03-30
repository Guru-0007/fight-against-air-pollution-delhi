-- ════════════════════════════════════════════════════════════════════
-- SUPABASE FIX POLICIES SCRIPT (POLLUSENSE V3.0)
-- ════════════════════════════════════════════════════════════════════
-- Instructions: Copy this entire script and run it in the Supabase 
-- SQL Editor to fix the "Session Expired" / Delete permission issues
-- and purge the broken IQAir articles causing frontend crashes.
-- ════════════════════════════════════════════════════════════════════

-- 1. Add missing DELETE policy for Government users on 'reports'
CREATE POLICY "reports_delete_gov" ON reports FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'government'));

-- 2. Add missing DELETE policy for Government users on 'report-images' bucket
CREATE POLICY "report_images_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-images' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'government'));

-- 3. Purge broken legacy IQAir articles
-- (This removes the broken legacy articles from the DB to prevent crashes)
DELETE FROM public.news_articles 
WHERE source ILIKE '%iqair%' OR url ILIKE '%iqair%';

-- Complete. You can verify the policies in your Supabase Auth/Storage dashboard.
