# Quick Start: Testing Supabase Authentication

## 1. Get Supabase Credentials

1. Go to https://app.supabase.com → Your Project → **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 2. Create a Test User

1. In Supabase Dashboard → **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter email and password
4. ✅ Check **Auto Confirm User** (to skip email verification)
5. Click **Create user**

## 3. Start the Widget

```bash
npm run dev
```

This opens the Electron widget window.

## 4. Configure & Login

1. Click **"Show settings"** in the widget
2. Enter:
   - **Orchestrator URL**: `http://127.0.0.1:9000` (or your Control Plane URL)
   - **Supabase URL**: Your project URL from step 1
   - **Supabase Anon Key**: Your anon key from step 1
3. Login with the test user credentials from step 2

## 5. Test It

1. Enter a task: `"Create a hello world script"`
2. Click **Run Task**
3. Check terminal output - should see "Using JWT token for authentication"
4. Check browser DevTools (F12) → Network tab → Verify `Authorization: Bearer ...` header

## Troubleshooting

- **Login fails**: Check Supabase URL and anon key are correct
- **API fails**: Verify Control Plane is running and has `SUPABASE_JWT_SECRET` set
- **JWT errors**: Get JWT secret from Supabase Dashboard → Settings → API → JWT Secret

See `TESTING_GUIDE.md` for detailed instructions.

