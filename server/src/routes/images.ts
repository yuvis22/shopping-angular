import express, { Router, Request, Response } from 'express';
import { getFileStream } from '../config/backblaze';

const router: Router = express.Router();

// GET /api/images/:filename
router.get('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      res.status(400).json({ error: 'Filename is required' });
      return;
    }

    console.log(`🖼️ Serving image: ${filename}`);
    
    try {
      const { stream, contentType, contentLength } = await getFileStream(filename);
      
      // Set headers
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      
      // Cache for 1 day
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      // Pipe stream to response
      stream.pipe(res);
      
      stream.on('error', (err: any) => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' });
        }
      });
      
    } catch (b2Error: any) {
      if (b2Error.response?.status === 404) {
        console.warn(`⚠️ Image not found: ${filename}`);
        res.status(404).json({ error: 'Image not found' });
      } else {
        console.error('❌ Error serving image:', b2Error);
        res.status(500).json({ error: 'Failed to serve image' });
      }
    }
  } catch (error) {
    console.error('Server error handling image request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
