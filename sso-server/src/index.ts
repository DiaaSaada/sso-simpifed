import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import path from 'path';

const app = express();
const PORT = 5000;
const SECRET_KEY = 'sso-secret-key-change-in-production';

// Hardcoded users
const users: Record<string, string> = {
  alice: 'pass123',
  bob: 'pass456'
};

// Active sessions store - tracks logged-in users
const activeSessions = new Set<string>();

// Configure EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// GET /login - Show login form or redirect if already authenticated
app.get('/login', (req: Request, res: Response) => {
  console.log('SSO: Login page requested');
  const redirectUri = req.query.redirect_uri as string || '';
  const ssoSession = req.cookies.sso_session;

  // Check if user already has valid SSO session
  if (ssoSession) {
    try {
      const decoded = jwt.verify(ssoSession, SECRET_KEY) as { user: string };
      console.log(`SSO: User "${decoded.user}" already authenticated`);
      // Valid session - create new token for the app and redirect
      const token = jwt.sign({ user: decoded.user }, SECRET_KEY, { expiresIn: '1h' });
      if (redirectUri) {
        console.log(`SSO: Redirecting to app: ${redirectUri}`);
        const separator = redirectUri.includes('?') ? '&' : '?';
        return res.redirect(`${redirectUri}${separator}token=${token}`);
      }
      return res.render('logged-in', { user: decoded.user });
    } catch (err) {
      console.log('SSO: Invalid session, clearing cookie');
      // Invalid session, clear cookie and show login form
      res.clearCookie('sso_session');
    }
  }

  console.log('SSO: Showing login form');
  // Show login form
  res.render('login', { redirectUri, error: null });
});

// POST /login - Handle login form submission
app.post('/login', (req: Request, res: Response) => {
  const { username, password, redirect_uri } = req.body;
  console.log(`SSO: Login attempt for user "${username}"`);

  // Validate credentials
  if (!users[username] || users[username] !== password) {
    console.log(`SSO: Login failed for user "${username}"`);
    return res.render('login', { redirectUri: redirect_uri || '', error: 'Invalid credentials' });
  }

  console.log(`SSO: Login successful for user "${username}"`);

  // Add user to active sessions
  activeSessions.add(username);
  console.log(`SSO: Added "${username}" to active sessions`);

  // Create JWT token
  const token = jwt.sign({ user: username }, SECRET_KEY, { expiresIn: '1h' });

  // Set SSO session cookie (1 hour expiry)
  res.cookie('sso_session', token, {
    httpOnly: true,
    maxAge: 60 * 60 * 1000 // 1 hour in milliseconds
  });

  // Redirect to app with token, or show success message
  if (redirect_uri) {
    console.log(`SSO: Redirecting to app: ${redirect_uri}`);
    const separator = redirect_uri.includes('?') ? '&' : '?';
    return res.redirect(`${redirect_uri}${separator}token=${token}`);
  }

  res.render('login-success', { user: username });
});

// POST /verify - Verify a token
app.post('/verify', (req: Request, res: Response) => {
  const { token } = req.body;
  console.log('SSO: Token verification requested');

  if (!token) {
    console.log('SSO: No token provided');
    return res.json({ valid: false });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { user: string };

    // Check if user still has an active session
    if (!activeSessions.has(decoded.user)) {
      console.log(`SSO: User "${decoded.user}" has no active session (logged out)`);
      return res.json({ valid: false });
    }

    console.log(`SSO: Token valid for user "${decoded.user}"`);
    res.json({ valid: true, user: decoded.user });
  } catch (err) {
    console.log('SSO: Token invalid');
    res.json({ valid: false });
  }
});

// GET /logout - Clear session and show logout message
app.get('/logout', (req: Request, res: Response) => {
  const ssoSession = req.cookies.sso_session;

  // Remove user from active sessions
  if (ssoSession) {
    try {
      const decoded = jwt.verify(ssoSession, SECRET_KEY) as { user: string };
      activeSessions.delete(decoded.user);
      console.log(`SSO: Removed "${decoded.user}" from active sessions`);
    } catch (err) {
      // Token invalid, but we still clear the cookie
    }
  }

  console.log('SSO: User logged out');
  res.clearCookie('sso_session');
  res.render('logout');
});

app.listen(PORT, () => {
  console.log(`SSO Server running on http://localhost:${PORT}`);
});
