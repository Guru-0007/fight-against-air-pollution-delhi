import express from 'express';
import fetch from 'node-fetch';
import { supabase } from '../db/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // 1. Check if we already have articles for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: todayArticles, error: checkError } = await supabase
      .from('articles')
      .select('id')
      .gte('created_at', startOfDay.toISOString());

    if (!checkError && (!todayArticles || todayArticles.length === 0)) {
      // Fetch new articles from Google News RSS
      const articles = await fetchFromGoogleNewsRSS();
      
      if (articles && articles.length > 0) {
        // Take top 3 max
        const topArticles = articles.slice(0, 3);
        
        // Insert new articles into DB (ignore uniqueness conflicts on URL)
        for (const item of topArticles) {
          await supabase.from('articles').insert({
            title: item.title,
            source: item.source,
            url: item.url,
            image_url: null, // RSS generally doesn't provide easy image_url
            published_at: item.publishedAt
          }).catch(() => {}); // Catch unique constraint errors silently
        }

        // Cap to 25 articles total by deleting oldest
        const { data: allArticles } = await supabase
          .from('articles')
          .select('id')
          .order('published_at', { ascending: false });
        
        if (allArticles && allArticles.length > 25) {
          const idsToDelete = allArticles.slice(25).map(a => a.id);
          if (idsToDelete.length > 0) {
            await supabase.from('articles').delete().in('id', idsToDelete);
          }
        }
      }
    }

    // 2. Return articles from DB
    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false });

    if (error || !articles || articles.length === 0) {
      // Ultimate Fallback
      return res.json(getRecentPollutionArticles());
    }

    res.json(articles);
  } catch (err) {
    console.error('News fetch error:', err.message);
    res.json(getRecentPollutionArticles());
  }
});

// ── Google News RSS Feed (free, no API key) ──
async function fetchFromGoogleNewsRSS() {
  try {
    const query = encodeURIComponent('Delhi air pollution AQI process');
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
    const resp = await fetch(rssUrl, {
      headers: { 'User-Agent': 'DelhiAirQualityPlatform/2.0' }
    });
    const xml = await resp.text();

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 12) {
      const itemXml = match[1];
      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const pubDate = extractTag(itemXml, 'pubDate');
      const source = extractTag(itemXml, 'source');

      if (title && link) {
        items.push({
          title: decodeHTMLEntities(title),
          url: decodeHTMLEntities(link),
          publishedAt: pubDate || new Date().toISOString(),
          source: source ? decodeHTMLEntities(source) : 'Google News'
        });
      }
    }

    return items;
  } catch (e) {
    console.error('RSS fetch error:', e.message);
    return [];
  }
}

function extractTag(xml, tag) {
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`);
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const m = xml.match(regex);
  return m ? m[1].trim() : '';
}

function decodeHTMLEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function getRecentPollutionArticles() {
  const now = new Date();
  return [
    {
      title: 'Delhi AQI remains in severe category as winter pollution peaks',
      url: 'https://www.ndtv.com/delhi-news',
      published_at: new Date(now - 3600000).toISOString(),
      source: 'NDTV'
    },
    {
      title: 'GRAP Stage 3 restrictions imposed across NCR region',
      url: 'https://www.thehindu.com/news/national',
      published_at: new Date(now - 7200000).toISOString(),
      source: 'The Hindu'
    }
  ];
}

export default router;
