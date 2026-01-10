# SSO Demo

## Setup
```
npm install
```

## Run
```
npm run dev
```

Or run separately:
- `npm run sso` (port 5000)
- `npm run hr` (port 5001)
- `npm run finance` (port 5002)

## Test Flow
1. Open http://localhost:5001 (HR app)
2. You'll be redirected to SSO login
3. Login with alice / pass123
4. You're now on HR dashboard
5. Click the Finance app link
6. You should be auto-logged in (no login form!)
7. Click logout to end session

## Users
- alice / pass123
- bob / pass456
