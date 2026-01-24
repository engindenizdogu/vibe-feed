# Storing Agent-Generated Code Architecture

## Recommended Architecture

**Store code in Supabase Storage + metadata in Database**

This is the standard pattern for this use case.

### 1. Database Schema (apps table)

Add these columns if not present:

```sql
ALTER TABLE apps ADD COLUMN code_url TEXT; -- URL to stored code
ALTER TABLE apps ADD COLUMN code_language VARCHAR(50); -- python, javascript, etc
ALTER TABLE apps ADD COLUMN code_version INT DEFAULT 1;
ALTER TABLE apps ADD COLUMN is_generated BOOLEAN DEFAULT true;
ALTER TABLE apps ADD COLUMN generation_status VARCHAR(50); -- 'generating', 'complete', 'failed'
```

### 2. Supabase Storage Bucket

Create a bucket called `app-code`:
- Path: `/app-code/{app_id}/v{version}.py` (or .js, .ts, etc)

### 3. Flow

```
Prompt → Agent generates code → Store in Supabase Storage
                               → Save metadata to DB
                               → Return URL + reference
                               → Daytona fetches from URL and runs
```

### 4. Why This Approach?

- ✅ Code can be any size (not limited by DB)
- ✅ Easy versioning (v1, v2, v3...)
- ✅ Daytona can fetch via HTTP URL
- ✅ Can show code in UI by fetching from storage
- ✅ Audit trail (all versions preserved)

## Implementation Options

### Option A: Store Code API Endpoint
Create a new API endpoint `/api/v1/apps/{id}/code` that:
- Stores generated code in Supabase Storage
- Updates the apps table
- Returns the code URL

### Option B: Database Migration
Create a database migration to update the schema with the new columns

### Option C: Seed Script
Create a seed script to test the flow with fake generated code

## Storage Structure Example

```
app-code/
├── 550e8400-e29b-41d4-a716-446655440000/
│   ├── v1.py      (first version)
│   ├── v2.py      (updated version)
│   └── v3.py      (latest version)
├── 660e8400-e29b-41d4-a716-446655440001/
│   └── v1.py
```

## API Response Example

When an app is created:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Todo App",
  "prompt": "Create a todo application",
  "is_published": false,
  "code_url": "https://YOUR_SUPABASE.supabase.co/storage/v1/object/public/app-code/550e8400-e29b-41d4-a716-446655440000/v1.py",
  "code_language": "python",
  "code_version": 1,
  "is_generated": true,
  "generation_status": "complete",
  "created_at": "2026-01-24T12:00:00Z"
}
```

## Daytona Integration

Daytona can fetch and run the code:

```python
# In Daytona sandbox
code_url = "https://YOUR_SUPABASE.supabase.co/storage/v1/object/public/app-code/{app_id}/v{version}.py"
response = requests.get(code_url)
code = response.text

# Execute in sandbox
exec(code)
```

## Security Considerations

1. **RLS (Row Level Security)** - Ensure users can only access their own code
2. **Storage Policies** - Restrict who can read/write code files
3. **Code Validation** - Scan generated code for malicious patterns before storage
4. **Versioning** - Keep all versions for audit and rollback
5. **Sandbox Isolation** - Daytona runs code in isolated container anyway
