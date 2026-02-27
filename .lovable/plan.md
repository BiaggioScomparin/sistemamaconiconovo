

## Plan: Filter Permissions Page to Show Only Members

Currently, the Permissions page (`src/pages/admin/Permissions.tsx`) queries all profiles that have a `user_id` (`.not('user_id', 'is', null)`), showing users of any status.

### Change

In `src/pages/admin/Permissions.tsx`, add a filter to the Supabase query to only return profiles where `status = 'membro'`:

```typescript
// Line ~51: Add .eq('status', 'membro') to the query
.from('profiles')
.select('id, full_name, cim_number, email, member_status, user_id, user_permissions(*)')
.not('user_id', 'is', null)
.eq('status', 'membro')
.order('full_name', { ascending: true });
```

This single-line addition ensures only approved members appear in the permissions management table.

