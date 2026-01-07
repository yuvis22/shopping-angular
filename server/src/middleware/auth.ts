import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  body: any;
  params: any;
  file?: Express.Multer.File;
  headers: any;
}

export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token with Clerk
    // Clerk SDK v5: verifyToken returns the JWT payload
    const sessionToken = await clerkClient.verifyToken(token);

    if (!sessionToken || !sessionToken.sub) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    // Get user info - sessionToken.sub contains the user ID
    const userId = sessionToken.sub;
    const user = await clerkClient.users.getUser(userId);

    req.userId = user.id;
    req.userRole = (user.publicMetadata as any)?.role || 'user';

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized: Token verification failed' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }
  next();
};
