import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import pool from './shared/db';
import redisClient from './shared/redis';
import { encode } from './shared/base62';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.WRITE_PORT || 3001;

(async () => {
  await redisClient.connect();
})();

// Create Short URL
app.post('/urls', async (req: Request, res: Response) => {
  const { originalUrl } = req.body;
  if (!originalUrl) {
    res.status(400).json({ error: 'Original URL is required' });
    return;
  }

  try {
    // Get next ID from sequence to generate short_code
    const seqResult = await pool.query("SELECT nextval('urls_id_seq')");
    const id = parseInt(seqResult.rows[0].nextval);
    const shortCode = encode(id);

    const result = await pool.query(
      'INSERT INTO urls (id, original_url, short_code) VALUES ($1, $2, $3) RETURNING *',
      [id, originalUrl, shortCode]
    );
    const newUrl = result.rows[0];

    // Cache in Redis
    await redisClient.set(shortCode, originalUrl);

    res.status(201).json(newUrl);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List URLs (Pagination)
app.get('/urls', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      'SELECT * FROM urls ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update URL
app.patch('/urls/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { originalUrl } = req.body;

  if (!originalUrl) {
    res.status(400).json({ error: 'originalUrl is required for update' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE urls SET original_url = $1 WHERE id = $2 RETURNING *',
      [originalUrl, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'URL not found' });
      return;
    }

    const updatedUrl = result.rows[0];
    
    // Update Redis Cache
    await redisClient.set(updatedUrl.short_code, originalUrl);

    res.json(updatedUrl);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Write service running on port ${PORT}`);
});
