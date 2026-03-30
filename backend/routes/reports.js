import express from 'express';
import multer from 'multer';
import { supabase, createUserClient } from '../db/supabase.js';
import { authenticateUser, authorizeGov } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Multer for image uploads — memory storage (then upload to Supabase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Valid status values
const VALID_STATUSES = ['pending', 'valid', 'fake', 'working', 'resolved'];

// ── Submit Report (authenticated citizen) ──
router.post('/', authenticateUser, upload.single('image'), async (req, res) => {
  if (req.user.is_banned) {
    return res.status(403).json({ error: 'Your account has been suspended.' });
  }

  const { title, description, location_text, lat, lng, category } = req.body;
  if (!title || !description || !location_text || !category) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const userClient = createUserClient(req.accessToken);

    // Enforce Rate Limit: max 5 reports per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await userClient
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', oneDayAgo);

    if (countError) {
      console.error('Rate limit check error:', countError);
    } else if (count >= 5) {
      return res.status(429).json({ error: 'Daily report limit (5) reached. Try again tomorrow.' });
    }

    let image_url = null;
    if (req.file) {
      try {
        const ext = req.file.originalname.split('.').pop();
        const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const filePath = `reports/${filename}`;

        console.log(`[Storage] Attempting upload: ${filePath} (${req.file.size} bytes)`);

        // Use userClient for storage to satisfy the 'authenticated' policy
        const { data: uploadData, error: uploadError } = await userClient.storage
          .from('report-images')
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });

        if (uploadError) {
          console.error('[Storage Error] Upload failed:', uploadError.message || uploadError);
          // Fallback to anonymous if authenticated fails (bucket might be public-write)
          const { data: anonData, error: anonError } = await supabase.storage
            .from('report-images')
            .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
          
          if (!anonError) {
            const { data: urlData } = supabase.storage.from('report-images').getPublicUrl(filePath);
            image_url = urlData.publicUrl;
            console.log('[Storage] Anon fallback succeeded:', image_url);
          } else {
            console.error('[Storage Error] Anon fallback also failed:', anonError.message || anonError);
          }
        } else {
          const { data: urlData } = supabase.storage.from('report-images').getPublicUrl(filePath);
          image_url = urlData.publicUrl;
          console.log('[Storage] Upload successful:', image_url);
        }
      } catch (storageErr) {
        console.error('[Storage Exception]:', storageErr);
      }
    }

    // Insert report into Supabase DB
    const { data: report, error: insertError } = await userClient
      .from('reports')
      .insert({
        user_id: req.user.id,
        title,
        description,
        location_text,
        lat: parseFloat(lat) || 28.6139,
        lng: parseFloat(lng) || 77.2090,
        category,
        image_url,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Report insert error:', insertError);
      return res.status(500).json({ error: 'Failed to submit report.' });
    }

    res.status(201).json({ success: true, id: report.id });
  } catch (err) {
    console.error('Report submit error:', err);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

// ── Get Reports ──
router.get('/', async (req, res) => {
  const { status } = req.query;
  try {
    let query = supabase
      .from('reports')
      .select('*, profiles!reports_user_id_fkey(display_name, is_verified, is_banned, username)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error('Reports fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch reports.' });
    }

    // Flatten the joined profile data
    const result = (reports || []).map(r => ({
      ...r,
      display_name: r.profiles?.display_name || 'Unknown',
      is_verified: r.profiles?.is_verified || false,
      is_banned: r.profiles?.is_banned || false,
      username: r.profiles?.username || 'unknown',
      profiles: undefined
    }));

    res.json(result);
  } catch (err) {
    console.error('Reports fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// ── Get My Reports (authenticated user) ──
router.get('/my-reports', authenticateUser, async (req, res) => {
  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(reports || []);
  } catch (err) {
    console.error('My reports error:', err);
    res.status(500).json({ error: 'Failed to fetch your reports.' });
  }
});

// ── Leaderboard ──
router.get('/leaderboard', async (req, res) => {
  try {
    // 100% Reliable Leaderboard: Dynamically aggregate valid/resolved reports without relying on SQL views
    const { data: rawReports, error } = await supabase
      .from('reports')
      .select('user_id, status, profiles!reports_user_id_fkey(display_name, username, is_verified, is_banned, role)')
      .in('status', ['valid', 'resolved']);

    if (error) throw error;

    // Group and count
    const userMap = {};
    (rawReports || []).forEach(r => {
      if (!r.profiles || r.profiles.is_banned || r.profiles.role !== 'user') return;
      
      const uId = r.user_id;
      if (!userMap[uId]) {
        userMap[uId] = {
          id: uId,
          username: r.profiles.username,
          display_name: r.profiles.display_name,
          is_verified: r.profiles.is_verified,
          report_count: 0
        };
      }
      userMap[uId].report_count++;
    });

    const sortedUsers = Object.values(userMap)
      .sort((a, b) => b.report_count - a.report_count)
      .slice(0, 10);

    res.json(sortedUsers);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

// ── Update Report Status (Gov only) ──
router.patch('/:id/status', authorizeGov, async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    // Get current status for audit trail
    const { data: current } = await supabase
      .from('reports')
      .select('status')
      .eq('id', req.params.id)
      .single();

    // Update report
    const govClient = createUserClient(req.accessToken);
    const { error: updateError } = await govClient
      .from('reports')
      .update({ status, status_updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    // Log status change
    await govClient.from('report_status_history').insert({
      report_id: req.params.id,
      old_status: current?.status || 'pending',
      new_status: status,
      changed_by: req.user.id
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Failed to update report.' });
  }
});

// ── Ban User (Gov only) ──
router.post('/ban-user/:id', authorizeGov, async (req, res) => {
  try {
    const govClient = createUserClient(req.accessToken);

    const { error } = await govClient
      .from('profiles')
      .update({ is_banned: true })
      .eq('id', req.params.id);

    if (error) throw error;

    // Log ban
    await govClient.from('banned_users').insert({
      user_id: req.params.id,
      banned_by: req.user.id,
      reason: req.body.reason || 'Policy violation'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Ban error:', err);
    res.status(500).json({ error: 'Failed to ban user.' });
  }
});

// ── Unban User (Gov only) ──
router.post('/unban-user/:id', authorizeGov, async (req, res) => {
  try {
    const govClient = createUserClient(req.accessToken);

    const { error } = await govClient
      .from('profiles')
      .update({ is_banned: false })
      .eq('id', req.params.id);

    if (error) throw error;

    // Remove ban record
    await govClient.from('banned_users')
      .delete()
      .eq('user_id', req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Unban error:', err);
    res.status(500).json({ error: 'Failed to unban user.' });
  }
});


// ── Delete Report (Gov only) ──
router.delete('/:id', authorizeGov, async (req, res) => {
  try {
    const govClient = createUserClient(req.accessToken);

    // Get report to find image URL
    const { data: report } = await govClient.from('reports').select('image_url').eq('id', req.params.id).single();

    // Delete from DB
    const { error: deleteError } = await govClient
      .from('reports')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    // Delete image from storage if it exists
    if (report && report.image_url) {
      const urlParts = report.image_url.split('/');
      const filename = urlParts[urlParts.length - 1];
      if (filename) {
        await supabase.storage.from('report-images').remove([`reports/${filename}`]).catch(() => {});
      }
    }

    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Delete report error:', err);
    res.status(500).json({ error: 'Failed to delete report.' });
  }
});

export default router;
