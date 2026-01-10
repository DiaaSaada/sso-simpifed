import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';

const app = express();
const PORT = 5002;
const SSO_SERVER = 'http://localhost:5000';
const CALLBACK_URL = 'http://localhost:5002/callback';

// Configure EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cookieParser());
app.use(express.json());

// Fake finance data
const reports = [
  { id: 1, name: 'Q4 Revenue Report', date: '2024-12-15', status: 'Completed' },
  { id: 2, name: 'Annual Budget 2025', date: '2024-12-20', status: 'In Review' },
  { id: 3, name: 'Expense Analysis', date: '2024-12-22', status: 'Completed' },
  { id: 4, name: 'Cash Flow Forecast', date: '2024-12-28', status: 'Pending' },
];

// GET / - Redirect to dashboard
app.get('/', (req: Request, res: Response) => {
  res.redirect('/dashboard');
});

// GET /callback - Receive token from SSO
app.get('/callback', (req: Request, res: Response) => {
  const token = req.query.token as string;

  if (!token) {
    return res.redirect(`${SSO_SERVER}/login?redirect_uri=${encodeURIComponent(CALLBACK_URL)}`);
  }

  // Store token in cookie
  res.cookie('auth_token', token, {
    httpOnly: true,
    maxAge: 60 * 60 * 1000 // 1 hour
  });

  res.redirect('/dashboard');
});

// GET /dashboard - Protected route
app.get('/dashboard', async (req: Request, res: Response) => {
  const authToken = req.cookies.auth_token;

  // No token - redirect to SSO login
  if (!authToken) {
    return res.redirect(`${SSO_SERVER}/login?redirect_uri=${encodeURIComponent(CALLBACK_URL)}`);
  }

  // Verify token with SSO server
  try {
    const response = await fetch(`${SSO_SERVER}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: authToken })
    });

    const data = await response.json() as { valid: boolean; user?: string };

    if (!data.valid) {
      // Invalid token - clear cookie and redirect to SSO login
      res.clearCookie('auth_token');
      return res.redirect(`${SSO_SERVER}/login?redirect_uri=${encodeURIComponent(CALLBACK_URL)}`);
    }

    // Valid token - show dashboard
    res.render('dashboard', { user: data.user, reports, ssoServer: SSO_SERVER });
  } catch (err) {
    // SSO server error - redirect to login
    res.clearCookie('auth_token');
    res.redirect(`${SSO_SERVER}/login?redirect_uri=${encodeURIComponent(CALLBACK_URL)}`);
  }
});

app.listen(PORT, () => {
  console.log(`Finance App running on http://localhost:${PORT}`);
});
