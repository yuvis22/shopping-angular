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
    res.json(products);
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
    res.json(product);
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
          const fileName = `${Date.now()}-${req.file.originalname}`;
          imageUrl = await uploadFileToB2(fileName, req.file.buffer, req.file.mimetype);
        } catch (b2Error: any) {
          console.error('Backblaze B2 upload error:', b2Error);
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

      const product = new Product({
        name,
        price: parseFloat(price),
        description,
        category,
        imageUrl,
      });

      await product.save();
      res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: 'Failed to create product' });
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
