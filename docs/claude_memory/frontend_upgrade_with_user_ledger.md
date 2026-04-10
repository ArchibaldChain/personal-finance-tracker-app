# Plan: Frontend Ledger + User Context + Auth Scaffolding

## Context
The backend now has User, Ledger, and ledger-scoped categories. The frontend has zero awareness of ledgers, users, or auth. This plan wires the frontend to:
1. Fetch the default ledger on startup and store its ID in a React Context
2. Pass `ledger_id` to category API calls
3. Display the current user's display name + avatar in the nav
4. Add auth scaffolding (login page, ProtectedRoute, auth interceptor) ready for Google Sign-In later

No real auth now — existing behavior preserved with the dev default user. All auth hooks are no-ops until GSP is connected.

---

## Part 1 — Backend: Add GET /ledgers/default endpoint

### New files

**`backend/app/schemas/ledger_schema.py`**
```python
class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    display_name: str
    email: str
    avatar_url: str | None = None

class LedgerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    base_currency: str
    is_default: bool
    owner: UserRead
```

**`backend/app/api/routes/ledgers.py`**
```python
GET /ledgers/default
# Returns the default ledger (is_default=True) with owner user eagerly loaded.
# 404 if none exists.
```

### Modified files
**`backend/app/api/routes/__init__.py`** — include ledgers router.

---

## Part 2 — Frontend

### Files to create (5)

**`frontend/src/api/ledgers.ts`** — `getDefaultLedger()` → GET /ledgers/default

**`frontend/src/context/AppContext.tsx`** — fetches default ledger + user on mount:
```ts
interface AppContextValue {
  ledgerId: number | null;
  user: { id: number; displayName: string; email: string; avatarUrl: string | null } | null;
  loading: boolean;
}
```

**`frontend/src/context/AuthContext.tsx`** — no-op auth layer, ready for Firebase GSP:
```ts
interface AuthContextValue {
  isAuthenticated: boolean;  // always true for now
  token: string | null;      // null until GSP connected
  signIn: () => void;        // no-op → will trigger Google OAuth
  signOut: () => void;       // no-op → will clear token + redirect
}
```

**`frontend/src/components/ProtectedRoute.tsx`** — currently passes through; later redirects to /login

**`frontend/src/pages/LoginPage.tsx`** — centered card with placeholder "Sign in with Google" button

### Files to modify (6)

**`frontend/src/api/client.ts`** — add Bearer token interceptor slot (no-op until GSP)

**`frontend/src/types/index.ts`** — add `User`, `LedgerRead`; add `ledger_id: number | null` to Category/Transaction/Import

**`frontend/src/api/categories.ts`** — `listCategories(ledgerId?)` passes `?ledger_id=`

**`frontend/src/hooks/useCategories.ts`** — reads `ledgerId` from AppContext

**`frontend/src/components/Layout.tsx`** — user avatar (initials fallback), display_name, Sign Out button

**`frontend/src/App.tsx`** — wrap with AuthProvider + AppProvider, add /login route

---

## Adding GSP later
1. Install Firebase SDK
2. Add `VITE_FIREBASE_API_KEY` etc. to `.env`
3. Replace `signIn()` no-op with `signInWithPopup(googleProvider)`
4. Store Firebase ID token → `client.ts` interceptor already attaches it
5. Backend validates token via new auth middleware
6. Flip `isAuthenticated` to real auth state → ProtectedRoute works automatically

---

## Not changed
- All transaction/import components and pages
- `createCategory`, `updateCategory`, `deleteCategory` (operate by ID)
- No Firebase SDK yet

---

## Verification
```bash
# Backend
cd backend && uv run uvicorn app.main:app --reload
curl http://localhost:8000/ledgers/default  # → {id, name, owner: {display_name: "Developer"}}

# Frontend
cd frontend && npm run dev
# Nav shows "Developer" + initials avatar + "Sign Out" (no-op)
# /login renders placeholder Google Sign-In
# Network tab: GET /categories?ledger_id=1
npm run build  # zero TypeScript errors
```
