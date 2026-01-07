# Shopping App Setup Guide

This guide will help you set up the shopping app with MongoDB, Backblaze B2, and Clerk authentication.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- Clerk account
- Backblaze B2 account

## Backend Setup

### 1. Install Backend Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/shopping-app
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shopping-app

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Backblaze B2 Configuration
B2_APPLICATION_KEY_ID=your_b2_key_id
B2_APPLICATION_KEY=your_b2_application_key
B2_BUCKET_ID=your_bucket_id
B2_BUCKET_NAME=your_bucket_name

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:4200
```

### 3. Get Your Credentials

#### MongoDB

- **Local**: Install MongoDB locally or use Docker
- **Atlas**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

#### Clerk

1. Sign up at [Clerk](https://clerk.com)
2. Create a new application
3. Get your **Secret Key** from the API Keys section
4. Get your **Publishable Key** for the frontend

#### Backblaze B2

1. Sign up at [Backblaze](https://www.backblaze.com/b2/cloud-storage.html)
2. Create a bucket
3. Create an Application Key with read/write permissions
4. Get your **Application Key ID** and **Application Key**
5. Get your **Bucket ID** and **Bucket Name**

### 4. Start the Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will run on `http://localhost:3000`

## Frontend Setup

### 1. Install Frontend Dependencies

```bash
# From the root directory
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_URL=http://localhost:3000/api

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
```

**Note**: For Angular, you may need to use `NG_APP_` prefix instead of `VITE_` depending on your build configuration.

### 3. Update app.config.ts

Make sure the Clerk publishable key is correctly referenced:

```typescript
provideClerk({
  publishableKey: import.meta.env['NG_APP_CLERK_PUBLISHABLE_KEY'] || '',
});
```

### 4. Start the Frontend

```bash
npm start
```

The app will run on `http://localhost:4200`

## Setting Up Admin Users

### 1. Create a User in Clerk

1. Go to your Clerk dashboard
2. Navigate to Users
3. Create a new user or use an existing one

### 2. Set Admin Role

1. Go to the user's profile in Clerk
2. Navigate to "Metadata"
3. Add to "Public metadata":
   ```json
   {
     "role": "admin"
   }
   ```

### 3. Test Admin Access

1. Sign in with the admin user
2. Navigate to `/admin` route
3. You should see the admin panel

## Project Structure

```
shopping-app/
├── server/                 # Backend server
│   ├── src/
│   │   ├── config/        # Database, B2 configuration
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Authentication middleware
│   │   └── server.ts      # Server entry point
│   └── package.json
├── src/                    # Frontend Angular app
│   └── app/
│       ├── admin/         # Admin panel components
│       ├── cart/         # Cart components
│       ├── product-*/    # Product components
│       ├── services/     # API services
│       └── guards/       # Route guards
└── package.json
```

## API Endpoints

### Products (Public)

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product

### Products (Admin Only)

- `POST /api/products` - Create product (requires auth token)
- `PUT /api/products/:id` - Update product (requires auth token)
- `DELETE /api/products/:id` - Delete product (requires auth token)

## Troubleshooting

### Backend Issues

1. **MongoDB Connection Error**

   - Check if MongoDB is running
   - Verify `MONGODB_URI` in `.env`

2. **Clerk Authentication Error**

   - Verify `CLERK_SECRET_KEY` is correct
   - Check token format in requests

3. **Backblaze B2 Upload Error**
   - Verify all B2 credentials are correct
   - Check bucket permissions
   - Ensure bucket is public for file access

### Frontend Issues

1. **Clerk Not Loading**

   - Check `VITE_CLERK_PUBLISHABLE_KEY` in `.env`
   - Verify Clerk is properly initialized in `app.config.ts`

2. **API Calls Failing**

   - Check `VITE_API_URL` is correct
   - Verify backend server is running
   - Check CORS settings in backend

3. **Admin Panel Not Accessible**
   - Verify user has `role: "admin"` in Clerk metadata
   - Check authentication guard is working

## Next Steps

1. Set up production environment variables
2. Configure CORS for production domain
3. Set up SSL/HTTPS
4. Configure Backblaze B2 bucket as public
5. Add error logging and monitoring
6. Set up CI/CD pipeline

## Support

For issues or questions, check:

- [Clerk Documentation](https://clerk.com/docs)
- [MongoDB Documentation](https://docs.mongodb.com)
- [Backblaze B2 Documentation](https://www.backblaze.com/b2/docs/)
