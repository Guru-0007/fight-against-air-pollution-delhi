-- ═══════════════════════════════════════════════
-- DELHI AIR QUALITY PLATFORM — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard > SQL)
-- ═══════════════════════════════════════════════

-- 1. PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'government')),
  is_verified BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  report_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. REPORTS TABLE
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_text TEXT NOT NULL,
  lat DOUBLE PRECISION DEFAULT 28.6139,
  lng DOUBLE PRECISION DEFAULT 77.2090,
  category TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','under_review','action_in_progress','resolved','valid','fake')),
  created_at TIMESTAMPTZ DEFAULT now(),
  status_updated_at TIMESTAMPTZ
);

-- 3. REPORT STATUS HISTORY (audit trail)
CREATE TABLE IF NOT EXISTS report_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- 4. BANNED USERS TABLE
CREATE TABLE IF NOT EXISTS banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES profiles(id),
  reason TEXT DEFAULT 'Policy violation',
  banned_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;

-- Profiles: public read
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
-- Profiles: user can insert own
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- Profiles: user can update own
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
-- Profiles: gov can update any (for ban/unban)
CREATE POLICY "profiles_update_gov" ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'government'));

-- Reports: public read
CREATE POLICY "reports_select" ON reports FOR SELECT USING (true);
-- Reports: authenticated insert (own)
CREATE POLICY "reports_insert" ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
-- Reports: gov can update any
CREATE POLICY "reports_update_gov" ON reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'government'));

-- Report status history: public read, gov insert
CREATE POLICY "history_select" ON report_status_history FOR SELECT USING (true);
CREATE POLICY "history_insert" ON report_status_history FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'government'));

-- Banned users: public read, gov insert/delete
CREATE POLICY "banned_select" ON banned_users FOR SELECT USING (true);
CREATE POLICY "banned_insert" ON banned_users FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'government'));
CREATE POLICY "banned_delete" ON banned_users FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'government'));

-- ═══════════════════════════════════════════════
-- TRIGGER: Auto-create profile on signup
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, email, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════
-- TRIGGER: Auto-increment report_count
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_report_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET report_count = report_count + 1 WHERE id = NEW.user_id;
  -- Auto-verify after 5 reports
  UPDATE profiles SET is_verified = true
    WHERE id = NEW.user_id AND report_count >= 5;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_created ON reports;
CREATE TRIGGER on_report_created
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION increment_report_count();

-- ═══════════════════════════════════════════════
-- LEADERBOARD VIEW
-- ═══════════════════════════════════════════════

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.is_verified,
  COUNT(r.id) FILTER (WHERE r.status IN ('valid', 'resolved')) as report_count
FROM profiles p
LEFT JOIN reports r ON r.user_id = p.id
WHERE p.is_banned = false AND p.role = 'user'
GROUP BY p.id, p.username, p.display_name, p.is_verified
HAVING COUNT(r.id) FILTER (WHERE r.status IN ('valid', 'resolved')) > 0
ORDER BY report_count DESC
LIMIT 10;

-- ═══════════════════════════════════════════════
-- STORAGE: report-images bucket
-- ═══════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "report_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-images');

CREATE POLICY "report_images_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'report-images');
