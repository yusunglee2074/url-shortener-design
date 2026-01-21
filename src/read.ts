import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import pool from './shared/db';
import redisClient from './shared/redis';

dotenv.config();

const app = express();
const PORT = process.env.READ_PORT || 3000;

(async () => {
  await redisClient.connect();
})();

app.get('/:shortCode', async (req: Request, res: Response) => {
  const shortCode = req.params.shortCode as string;

  try {
    // 1. Check Redis Cache
    const cachedUrl = await redisClient.get(shortCode);
    if (cachedUrl) {
      console.log(`Cache Hit: ${shortCode}`);
      res.redirect(302, cachedUrl);
      return;
    }

    // 2. Check Database
    console.log(`Cache Miss: ${shortCode}`);
    const result = await pool.query(
      'SELECT original_url FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (result.rows.length > 0) {
      const originalUrl = result.rows[0].original_url;
      
      // 3. Save to Redis
      await redisClient.set(shortCode, originalUrl);
      
      res.redirect(302, originalUrl);
      return;
    }

    res.status(404).send('URL not found');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Read service running on port ${PORT}`);
});
