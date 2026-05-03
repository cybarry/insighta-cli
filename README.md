# insighta-cli

> CLI tool for the Insighta Labs+ Demographic Intelligence Platform

**Backend API:** `https://insighta-backend-production-b142.up.railway.app`

---

## Installation

```bash
# Install globally from this repo
npm install -g .

# Or run directly
node bin/insighta.js <command>
```

After global install, use `insighta` from any directory.

---

## Authentication

```bash
# Login — opens browser for GitHub OAuth
insighta login

# Show current logged-in user
insighta whoami

# Logout
insighta logout
```

### How login works

1. CLI generates PKCE values (`state`, `code_verifier`, `code_challenge`)
2. Starts a local server on `localhost:9876`
3. Opens your browser to the backend OAuth flow
4. GitHub redirects back → backend issues tokens → redirects to localhost callback
5. CLI saves tokens to `~/.insighta/credentials.json`

### Token storage
- Credentials: `~/.insighta/credentials.json`
- Access token expires in **3 minutes** — CLI auto-refreshes on `401`
- Refresh token expires in **5 minutes** — if expired, prompts re-login

---

## Profiles Commands

### List profiles

```bash
insighta profiles list

# With filters
insighta profiles list --gender male
insighta profiles list --country NG --age-group adult
insighta profiles list --min-age 25 --max-age 40

# With sorting
insighta profiles list --sort-by age --order desc

# With pagination
insighta profiles list --page 2 --limit 20
```

### Get a single profile

```bash
insighta profiles get <uuid>
```

### Natural language search

```bash
insighta profiles search "young males from nigeria"
insighta profiles search "adult females above 30"
insighta profiles search "seniors from kenya"
```

### Create a profile (admin only)

```bash
insighta profiles create --name "Harriet Tubman"
```

### Export to CSV

```bash
# Export all profiles
insighta profiles export --format csv

# Export filtered
insighta profiles export --format csv --gender male --country NG
```

CSV is saved to the current working directory as `profiles_<timestamp>.csv`.

---

## Environment Variables

Override the backend URL:

```bash
INSIGHTA_API_URL=http://localhost:3000 insighta profiles list
```

---

## CI/CD

GitHub Actions runs on every PR to `main`:
- Syntax check all source files
- Verify `insighta --help` works