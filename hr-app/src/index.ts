import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';

const app = express();
const PORT = 5001;
const SSO_SERVER = 'http://localhost:5000';
const CALLBACK_URL = 'http://localhost:5001/callback';

// Configure EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cookieParser());
app.use(express.json());

// Fake HR data
const employees = [
  { id: 1, name: 'John Smith', department: 'Engineering', salary: '$95,000' },
  { id: 2, name: 'Sarah Johnson', department: 'Marketing', salary: '$78,000' },
  { id: 3, name: 'Mike Davis', department: 'Sales', salary: '$82,000' },
  { id: 4, name: 'Emily Brown', department: 'HR', salary: '$71,000' },
];

// GET / - Redirect to dashboard
app.get('/', (req: Request, res: Response) => {
  console.log('HR: Root accessed, redirecting to dashboard');
  res.redirect('/dashboard');
});

// GET /callback - Receive token from SSO
app.get('/callback', (req: Request, res: Response) => {
  const token = req.query.token as string;
  console.log('HR: Callback received from SSO');

  if (!token) {
    console.log('HR: No token in callback, redirecting to SSO');
    return res.redirect(`${SSO_SERVER}/login?redirect_uri=${encodeURIComponent(CALLBACK_URL)}`);
  }

  console.log('HR: Token received, storing in cookie');
  // Store token in cookie
  res.cookie('auth_token', token, {
    httpOnly: true,
    maxAge: 60 * 60 * 1000 // 1 hour
  });

  res.redirect('/dashboard');
});

// GET /dashboard - Protected route
app.get('/dashboard', async (req: Request, res: Response) => {
  console.log('HR: Dashboard requested');
  const authToken = req.cookies.auth_token;

  // No token - redirect to SSO login
  if (!authToken) {
    console.log('HR: No auth token, redirecting to SSO');
    return res.redirect(`${SSO_SERVER}/login?redirect_uri=${encodeURIComponent(CALLBACK_URL)}`);
  }

  // Verify token with SSO server
  console.log('HR: Verifying token with SSO server');
  try {
    const response = await fetch(`${SSO_SERVER}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: authToken })
    });

    const data = await response.json() as { valid: boolean; user?: string };

    if (!data.valid) {
      console.log('HR: Token invalid, redirecting to SSO');
      // Invalid token - clear cookie and redirect to SSO login
      res.clearCookie('auth_token');
      return res.redirect(`${SSO_SERVER}/login?redirect_uri=${encodeURIComponent(CALLBACK_URL)}`);
    }

    console.log(`HR: Token valid for user "${data.user}", showing dashboard`);
    // Valid token - show dashboard
    res.render('dashboard', { user: data.user, employees, ssoServer: SSO_SERVER });
  } catch (err) {
    console.log('HR: SSO server error, redirecting to login');
    // SSO server error - redirect to login
    res.clearCookie('auth_token');
    res.redirect(`${SSO_SERVER}/login?redirect_uri=${encodeURIComponent(CALLBACK_URL)}`);
  }
});

app.listen(PORT, () => {
  console.log(`HR App running on http://localhost:${PORT}`);
});
