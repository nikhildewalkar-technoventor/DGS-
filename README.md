# My Digital Journey — Final V5

A production-style student portfolio starter for Netlify + Supabase.

## Features
- Student signup without asking for an email in the UI
- Username + password login
- Student profile with school/class/roll number
- Profile photo
- Projects, activities, achievements, sports
- Photos on portfolio items
- Multi-photo gallery
- Supabase database + Storage
- Row Level Security
- Netlify-compatible deployment
- GitHub-compatible source structure

## Important authentication setup
This app intentionally presents username/password to students. Internally it maps each username to a generated Supabase Auth email alias:
`username@student.local`

In Supabase:
1. Authentication → Providers → Email
2. Enable Email provider
3. Turn OFF "Confirm email" for username-only instant signup.
4. Keep the project publishable key in the browser only.
5. Never put the service-role/secret key in frontend code or GitHub.

## Supabase setup
1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql` completely.
4. Copy Project URL and Publishable Key.
5. Put them in Netlify environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
6. Redeploy.

## Netlify
Build command:
`npm run build`

Publish directory:
`.`

Node:
`20`

The build creates `config.js` from environment variables. `config.js` is not meant to be committed.

## Photos
The SQL script creates a public `portfolio-images` bucket. Uploads are restricted to the signed-in student's own `<auth-user-id>/...` folder. Keep school policy/privacy in mind before publishing photos.

## Password reset limitation
Because students do not provide an email, the normal email reset workflow is not available. A school/admin password-reset flow should be added before production if students need self-service recovery.

## Production note
The app is functional once connected to your own Supabase project. ChatGPT cannot create or access your private Supabase project, so your project URL/key and SQL execution remain deployment steps on your side.
