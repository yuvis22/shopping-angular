import express, { Router } from 'express';
import multer from 'multer';
import Product from '../models/Product';
import { uploadFileToB2, deleteFileFromB2 } from '../config/backblaze';
import { authenticateUser, requireAdmin, AuthRequest } from '../middleware/auth';

const router: Router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    // Transform B2 URLs to proxy URLs
    const transformedProducts = products.map(product => {
      const p = product.toObject();
      // Check for any B2 URL (standard or S3-compatible style)
      if (p.imageUrl && (p.imageUrl.includes('backblazeb2.com') || p.imageUrl.includes('/file/'))) {
        const parts = p.imageUrl.split('/');
        const filename = parts[parts.length - 1];
        
        // Use ABSOLUTE URL for proxy so it hits the backend (port 3000) not frontend (port 4200)
        // host includes port
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        p.imageUrl = `${baseUrl}/api/images/${filename}`;
      }
      return p;
    });

    console.log(`📦 Fetched ${transformedProducts.length} products`);
    res.json(transformedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product (public)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const p = product.toObject();
    if (p.imageUrl && (p.imageUrl.includes('backblazeb2.com') || p.imageUrl.includes('/file/'))) {
      const parts = p.imageUrl.split('/');
      const filename = parts[parts.length - 1];
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      p.imageUrl = `${baseUrl}/api/images/${filename}`;
    }

    res.json(p);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (admin only)
router.post(
  '/',
  authenticateUser,
  requireAdmin,
  upload.single('image'),
  async (req: AuthRequest, res) => {
    try {
      const { name, price, description, category } = req.body;

      if (!name || !price || !description || !category) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      let imageUrl = '';

      if (req.file) {
        try {
          console.log('📤 Uploading image to Backblaze B2...');
          console.log('File details:', {
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          });

          const fileName = `${Date.now()}-${req.file.originalname}`;
          imageUrl = await uploadFileToB2(fileName, req.file.buffer, req.file.mimetype);

          console.log('✅ Image uploaded successfully to B2');
          console.log('Image URL:', imageUrl);
        } catch (b2Error: any) {
          console.error('❌ Backblaze B2 upload error:', b2Error);
          console.error('Error details:', {
            message: b2Error.message,
            stack: b2Error.stack,
          });
          res.status(500).json({
            error:
              'Failed to upload image to Backblaze B2. Please check your B2 credentials in server/.env file.',
            details: b2Error.message,
          });
          return;
        }
      } else {
        res.status(400).json({ error: 'Image is required' });
        return;
      }

      // Create product with image URL stored in MongoDB
      console.log('💾 Saving product to MongoDB with imageUrl:', imageUrl);

      if (!imageUrl || imageUrl.trim() === '') {
        console.error('❌ imageUrl is empty, cannot save product');
        res.status(500).json({ error: 'Failed to get image URL from Backblaze B2' });
        return;
      }

      const product = new Product({
        name,
        price: parseFloat(price),
        description,
        category,
        imageUrl, // This URL is stored in MongoDB and can be fetched later
      });

      await product.save();
      console.log('✅ Product saved to MongoDB:', product._id);
      console.log('Product imageUrl in DB:', product.imageUrl);
      console.log('📋 Full product data:', JSON.stringify(product.toObject(), null, 2));

      res.status(201).json(product);
    } catch (error: any) {
      console.error('❌ Error creating product:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);

      // Provide more specific error messages
      let errorMessage = 'Failed to create product';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'ValidationError') {
        errorMessage =
          'Product validation failed: ' +
          Object.values(error.errors)
            .map((e: any) => e.message)
            .join(', ');
      } else if (error.name === 'MongoServerError') {
        errorMessage = 'Database error: ' + error.message;
      }

      res.status(500).json({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
);

// Update product (admin only)
router.put(
  '/:id',
  authenticateUser,
  requireAdmin,
  upload.single('image'),
  async (req: AuthRequest, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const { name, price, description, category } = req.body;

      if (name) product.name = name;
      if (price) product.price = parseFloat(price);
      if (description) product.description = description;
      if (category) product.category = category;

      // If new image uploaded, delete old one and upload new
      if (req.file) {
        // Extract filename from old URL to delete
        const oldUrlParts = product.imageUrl.split('/');
        const oldFileName = oldUrlParts[oldUrlParts.length - 1];

        try {
          await deleteFileFromB2(oldFileName);
        } catch (error) {
          console.error('Error deleting old file:', error);
        }

        try {
          const fileName = `${Date.now()}-${req.file.originalname}`;
          product.imageUrl = await uploadFileToB2(fileName, req.file.buffer, req.file.mimetype);
        } catch (b2Error: any) {
          console.error('Backblaze B2 upload error:', b2Error);
          res.status(500).json({
            error:
              'Failed to upload image to Backblaze B2. Please check your B2 credentials in server/.env file.',
            details: b2Error.message,
          });
          return;
        }
      }

      await product.save();
      res.json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

// Delete product (admin only)
router.delete('/:id', authenticateUser, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Delete image from B2
    try {
      const urlParts = product.imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      await deleteFileFromB2(fileName);
    } catch (error) {
      console.error('Error deleting file from B2:', error);
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
