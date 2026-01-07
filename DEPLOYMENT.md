# Deployment Guide

## Frontend Deployment (Vercel)

### Prerequisites
1. Vercel account (sign up at https://vercel.com)
2. GitHub account (to connect your repository)

### Steps

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/shopping-app.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect Angular
   - Add environment variables:
     - `NG_APP_API_URL` - Your backend API URL (e.g., `https://shopping-angular-li9h.onrender.com/api`)
     - `NG_APP_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key (starts with `pk_live_` for production)

3. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-app.vercel.app`

## Backend Deployment Options

### Option 1: Railway (Recommended - Easy)

1. Go to https://railway.app
2. Sign up/login
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Select the `server` folder as the root
6. Add environment variables:
   - `PORT` (Railway sets this automatically)
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - `CLERK_SECRET_KEY` - Your Clerk secret key
   - `B2_APPLICATION_KEY_ID` - Backblaze B2 key ID
   - `B2_APPLICATION_KEY` - Backblaze B2 application key
   - `B2_BUCKET_ID` - Backblaze B2 bucket ID
   - `B2_BUCKET_NAME` - Backblaze B2 bucket name
   - `FRONTEND_URL` - Your Vercel frontend URL (e.g., `https://shopping-angular-three.vercel.app`)
7. Railway will auto-deploy and give you a URL like `https://your-app.railway.app`
8. Update `NG_APP_API_URL` in Vercel to point to `https://your-app.railway.app/api`

### Option 2: Render

1. Go to https://render.com
2. Sign up/login
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
6. Add environment variables (same as Railway)
7. Deploy and get your URL
8. Update Vercel environment variables

### Option 3: Vercel Serverless Functions (Advanced)

This requires refactoring the Express app to use Vercel serverless functions. See `serverless-setup.md` for details.

## Environment Variables Summary

### Frontend (Vercel)
- `NG_APP_API_URL` - Backend API URL
- `NG_APP_CLERK_PUBLISHABLE_KEY` - Clerk publishable key

### Backend (Railway/Render)
- `PORT` - Server port (usually auto-set)
- `MONGODB_URI` - MongoDB connection string
- `CLERK_SECRET_KEY` - Clerk secret key
- `B2_APPLICATION_KEY_ID` - Backblaze B2 credentials
- `B2_APPLICATION_KEY` - Backblaze B2 credentials
- `B2_BUCKET_ID` - Backblaze B2 bucket ID
- `B2_BUCKET_NAME` - Backblaze B2 bucket name
- `FRONTEND_URL` - Frontend URL for CORS

## Post-Deployment Checklist

- [ ] Backend is running and accessible
- [ ] Frontend environment variables are set
- [ ] CORS is configured correctly (FRONTEND_URL in backend)
- [ ] MongoDB Atlas IP whitelist includes Railway/Render IPs (or 0.0.0.0/0)
- [ ] Clerk production keys are used
- [ ] Test admin panel access
- [ ] Test product creation
- [ ] Test image uploads

