# Testing Guide: Supabase Authentication & JWT Integration

This guide will help you create a new user and verify that the widget's Supabase authentication and JWT integration are working correctly.

## Prerequisites

1. **Supabase Project**: You need a Supabase project set up
2. **Control Plane**: Your Control Plane should be running and configured with:
   - `SUPABASE_JWT_SECRET` in `.env`
   - JWT verification enabled

## Step 1: Get Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Project Settings** → **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 2: Create a New User in Supabase

You have two options:

### Option A: Create User via Supabase Dashboard (Recommended for Testing)

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Fill in:
   - **Email**: e.g., `test@example.com`
   - **Password**: Choose a secure password
   - **Auto Confirm User**: ✅ (check this to skip email verification)
4. Click **Create user**
5. Note the **User UID** (UUID) - this is your canonical user ID

### Option B: Create User via Sign Up (Self-Registration)

1. You can also let users sign up through the widget
2. The widget will need a sign-up form (currently only has login)
3. For now, use Option A for testing

## Step 3: Start the Widget

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

This will:
- Start the Vite dev server
- Launch the Electron app
- Open the widget window

## Step 4: Configure the Widget

1. In the widget window, click **"Show settings"**
2. Fill in the configuration:

   **Orchestrator URL:**
   - Your Control Plane URL (e.g., `http://127.0.0.1:9000` or `https://your-cp.example.com`)

   **Supabase URL:**
   - Paste your Supabase Project URL from Step 1
   - Example: `https://xxxxx.supabase.co`

   **Supabase Anon Key:**
   - Paste your anon/public key from Step 1
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. The settings are automatically saved to localStorage

## Step 5: Test Authentication

1. After entering Supabase credentials, you should see a **Login form**
2. Enter the credentials you created in Step 2:
   - **Email**: `test@example.com` (or your test user email)
   - **Password**: Your test user password
3. Click **Login**

### Expected Results:

✅ **Success:**
- You should see: "✓ Authenticated as test@example.com"
- Your **User ID** (UUID) should be displayed
- A **Logout** button appears

❌ **If login fails:**
- Check browser console (F12) for errors
- Verify Supabase URL and anon key are correct
- Verify the user exists in Supabase dashboard
- Check that email confirmation is not required (or confirm the email)

## Step 6: Test API Calls with JWT

### Test 1: Run a Task

1. In the widget, enter a task in the textarea:
   ```
   Create a simple hello world script
   ```
2. Click **Run Task**

### Expected Results:

✅ **Success:**
- Status shows "running" then "done"
- Task result is displayed
- Check Electron console (terminal where you ran `npm run dev`) for:
  ```
  Got task from widget: Create a simple hello world script
  Using control plane URL: http://127.0.0.1:9000
  Using JWT token for authentication
  Sending request to control plane: { "task": "Create a simple hello world script" }
  ```

❌ **If it fails:**
- Check the error message in the widget
- Verify Control Plane is running
- Check Control Plane logs for JWT verification errors
- Verify `SUPABASE_JWT_SECRET` is set correctly in Control Plane `.env`

### Test 2: Load Workspace

1. In settings, click **"Load from workspace"** button
2. This should fetch your workspace from the Control Plane

### Expected Results:

✅ **Success:**
- VNC URL is populated (if workspace exists)
- No error messages

❌ **If it fails:**
- Check browser console for errors
- Verify JWT token is being sent (check Network tab)
- Check Control Plane logs

## Step 7: Verify JWT Token is Working

### Check Electron Console

When you run a task, you should see in the terminal:
```
Using JWT token for authentication
```

### Check Network Requests (Browser DevTools)

1. Open browser DevTools (F12) in the Electron window
2. Go to **Network** tab
3. Run a task
4. Find the request to `/app/run_task`
5. Check **Headers**:
   - Should have: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Should NOT have `user_id` in the request body

### Verify in Control Plane Logs

Your Control Plane should log:
- JWT token verification success
- User ID extracted from token's `sub` claim
- No `user_id` in request body (it's extracted from JWT)

## Step 8: Test Multiple Users

1. Create another user in Supabase (different email)
2. Logout from the widget
3. Login with the new user
4. Run a task - it should use the new user's workspace
5. Each user should have their own isolated workspace

## Troubleshooting

### "Please authenticate with Supabase first"
- Make sure you've logged in successfully
- Check that Supabase URL and anon key are correct

### "Failed to initialize authentication"
- Verify Supabase URL format (should start with `https://`)
- Verify anon key is correct (should be a long JWT string)

### "HTTP 401: Unauthorized" or JWT verification errors
- Check Control Plane has `SUPABASE_JWT_SECRET` set correctly
- Verify the JWT secret matches your Supabase project's JWT secret
- Get JWT secret from: Supabase Dashboard → Project Settings → API → JWT Secret

### "Cannot reach TakeBridge backend"
- Verify Control Plane is running
- Check Orchestrator URL is correct
- Check network connectivity

### Token not being sent
- Check browser console for errors
- Verify authentication succeeded
- Try logging out and back in

## Verification Checklist

- [ ] Supabase credentials configured
- [ ] User created in Supabase
- [ ] Login successful in widget
- [ ] User ID (UUID) displayed after login
- [ ] Run Task works with JWT authentication
- [ ] Load Workspace works with JWT authentication
- [ ] Authorization header present in network requests
- [ ] No `user_id` in request body (extracted from JWT)
- [ ] Control Plane successfully verifies JWT
- [ ] Different users get different workspaces

## Next Steps

Once everything is working:
- You can add sign-up functionality to the widget
- Implement token refresh (Supabase tokens expire)
- Add better error handling and user feedback
- Consider adding OAuth providers (Google, GitHub, etc.)

