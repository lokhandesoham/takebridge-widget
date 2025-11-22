# JWT Token Troubleshooting: "Invalid token" Error

## The Problem

You're getting `HTTP 401: {"detail":"Invalid token"}` even though authentication in the widget succeeded.

## Root Cause

This is almost always a **JWT secret mismatch** between:
- The secret Supabase uses to **sign** tokens (in Supabase)
- The secret your Control Plane uses to **verify** tokens (in your `.env`)

## Solution Steps

### Step 1: Get the Correct JWT Secret from Supabase

⚠️ **IMPORTANT**: This is NOT the anon key!

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Project Settings** → **API**
4. Scroll down to find **JWT Secret** (not "anon/public key")
5. Click **Reveal** to show the secret
6. Copy the entire secret (it's a long string)

### Step 2: Verify Control Plane Configuration

In your Control Plane's `.env` file, make sure you have:

```env
SUPABASE_JWT_SECRET=your_jwt_secret_here
SUPABASE_JWT_ALG=HS256
```

**Common mistakes:**
- ❌ Using the anon key instead of JWT secret
- ❌ Extra whitespace or newlines in the secret
- ❌ Missing `SUPABASE_JWT_SECRET` entirely
- ❌ Typo in the secret value

### Step 3: Restart Control Plane

After updating `.env`, **restart your Control Plane** so it picks up the new secret:

```bash
# Stop the Control Plane (Ctrl+C)
# Then restart it
python -m uvicorn app.main:app --reload
# or however you run it
```

### Step 4: Verify the Secret Matches

The JWT secret in your Control Plane `.env` must **exactly match** the JWT secret from Supabase Dashboard.

**To verify:**
1. Check Supabase Dashboard → Settings → API → JWT Secret
2. Check your Control Plane `.env` file → `SUPABASE_JWT_SECRET`
3. They should be identical (no extra spaces, no typos)

### Step 5: Test Again

1. In the widget, try running a task again
2. Check the terminal output - you should see:
   ```
   Using JWT token for authentication
   JWT token (first 20 chars): eyJhbGciOiJIUzI1NiIs...
   ```
3. Check Control Plane logs - should show successful JWT verification

## Additional Debugging

### Check Token is Being Sent

1. Open browser DevTools (F12) in the Electron window
2. Go to **Network** tab
3. Run a task
4. Find the request to `/app/run_task`
5. Check **Headers** → Should see `Authorization: Bearer eyJ...`

### Check Token Format

The token should:
- Start with `eyJ` (base64 encoded JWT header)
- Have three parts separated by dots: `header.payload.signature`
- Be a long string (typically 200+ characters)

### Verify Token is Valid

You can decode the JWT token (without verifying) to see its contents:

1. Copy the token from the Authorization header
2. Go to https://jwt.io
3. Paste the token in the "Encoded" section
4. Check the **Payload** section:
   - Should have `sub` field with your user UUID
   - Should have `exp` (expiration timestamp)
   - Should have `email` field

**Note**: Don't paste the token anywhere public - it contains your user info!

### Check Token Expiration

Tokens expire after a certain time. If you've been logged in for a while:
1. Try logging out and back in
2. This will get a fresh token

### Common Issues Checklist

- [ ] `SUPABASE_JWT_SECRET` is set in Control Plane `.env`
- [ ] JWT secret matches Supabase Dashboard exactly (no typos, no extra spaces)
- [ ] Control Plane was restarted after setting the secret
- [ ] Token is being sent in `Authorization: Bearer <token>` header
- [ ] Token hasn't expired (try logging out/in to get fresh token)
- [ ] Using JWT Secret (not anon key) in Control Plane

## Still Not Working?

### Check Control Plane Logs

Look for JWT verification errors in your Control Plane logs. They might show:
- "Invalid token signature"
- "Token expired"
- "Invalid token format"

### Verify Control Plane Code

Make sure your Control Plane's JWT verification code is:
1. Using `SUPABASE_JWT_SECRET` from environment
2. Using the correct algorithm (HS256)
3. Extracting user ID from the `sub` claim in the token

### Test with a Simple Script

You can test JWT verification directly:

```python
from jose import jwt
import os

token = "your_jwt_token_here"
secret = os.getenv("SUPABASE_JWT_SECRET")

try:
    payload = jwt.decode(token, secret, algorithms=["HS256"])
    print("Token verified! User ID:", payload.get("sub"))
except Exception as e:
    print("Token verification failed:", e)
```

## Quick Fix Summary

1. **Get JWT Secret** from Supabase Dashboard → Settings → API → JWT Secret
2. **Set in Control Plane** `.env`: `SUPABASE_JWT_SECRET=<the_secret>`
3. **Restart Control Plane**
4. **Test again**

The JWT secret is different from the anon key - make sure you're using the correct one!

