# Roof — Architecture Refactoring Plan

## Important Rules

- **DO NOT change visual styles** — preserve all Tailwind classes, Framer Motion animations, colors, spacing, and layout exactly as they are
- **App language is English** — all UI text, labels, placeholders, error messages, and comments must remain in English
- **Incremental migration** — each phase must pass `npm run build` before moving to the next
- **Preserve hook APIs** — re-export from original context files so existing consumers don't need changes until cleanup phase
- **No new UI patterns** — this is an architecture refactoring, not a redesign

---

## New Dependencies

```bash
npm i zustand @tanstack/react-query zod react-error-boundary
```

---

## Phase 0: Foundation

**Goal**: Install deps, tighten compiler, add error boundary. Zero behavior change.

### Steps

1. Run `npm i zustand @tanstack/react-query zod react-error-boundary`

2. **Create `src/components/ErrorBoundary.tsx`**
   - Wrap `react-error-boundary`'s `ErrorBoundary` with a fallback UI
   - Fallback: centered card with "Something went wrong" + "Reload" button (`window.location.reload()`)
   - Match existing app styling (bg-background, text-foreground, rounded-2xl, etc.)

3. **Modify `package.json`** — add script:
   ```json
   "typecheck": "tsc --noEmit"
   ```

4. **Modify `tsconfig.json`**:
   - Set `"noUnusedLocals": true`
   - Set `"noUnusedParameters": true`
   - Fix resulting compile errors (prefix unused params with `_`)

5. **Modify `vite.config.ts`** — ensure path alias exists:
   ```ts
   resolve: { alias: { '@': path.resolve(__dirname, './src') } }
   ```

6. **Modify `src/App.tsx`** — wrap route content in `<ErrorBoundary>`:
   ```tsx
   import { ErrorBoundary } from '@/components/ErrorBoundary'
   // Inside BrowserRouter, wrap <AnimatePresence> with <ErrorBoundary>
   ```

7. Run `npm run build` — must pass

---

## Phase 1: Constants Extraction

**Goal**: Eliminate duplicated source colors, filter constants, and city lists.

### Steps

1. **Create `src/data/sources.ts`**:
   - Export `Source` type (union of all platform names from `Listing['source']`)
   - Export `sourceColors: Record<Source, string>` (hex values — move from `src/data/listings.ts`)
   - Export `SOURCE_BADGE_STYLES: Record<Source, { bg: string; text: string }>` (move from `SourceBadge.tsx`)
   - Export `SOURCE_BADGE_BG: Record<Source, string>` (bg-only classes — move from `ChatsPage.tsx`)

2. **Create `src/data/filters.ts`**:
   - Move from `FiltersSheet.tsx`: `ActiveFilters` interface, `DEFAULT_FILTERS`, `countActiveFilters()`
   - Move from `FiltersSheet.tsx` + `AlertSheet.tsx`: `ROOM_OPTIONS`, `SIZE_PRESETS`, `FURNISHED_OPTIONS`

3. **Create `src/data/cities.ts`**:
   - Move `NL_CITIES` from `AlertSheet.tsx`

4. **Update importers** (remove local duplicates, import from new files):
   - `src/data/listings.ts` — remove `sourceColors`, re-export from `sources.ts`
   - `src/components/ui/SourceBadge.tsx` — remove `BADGE_STYLES`, import from `@/data/sources`
   - `src/components/ui/NotificationsSheet.tsx` — remove `SOURCE_COLORS`, import from `@/data/sources`
   - `src/pages/app/ChatsPage.tsx` — remove `SOURCE_BADGE_BG`, import from `@/data/sources`
   - `src/components/ui/FiltersSheet.tsx` — remove type/constant defs, import from `@/data/filters`
   - `src/components/ui/AlertSheet.tsx` — remove `ROOM_OPTIONS`, `SIZE_PRESETS`, `NL_CITIES`, import from `@/data/filters` and `@/data/cities`
   - `src/context/AlertsContext.tsx` — update import path for `ActiveFilters`/`DEFAULT_FILTERS`

5. Run `npm run build` — must pass

---

## Phase 2: Zod Schemas

**Goal**: Runtime validation. Eliminate unsafe `as T` casts.

### Steps

1. **Create `src/schemas/listing.ts`** — Zod schema matching `Listing` interface exactly
2. **Create `src/schemas/alert.ts`** — Zod schema for `Alert` and `ActiveFilters`
3. **Create `src/schemas/notifications.ts`** — schema for `NotificationsState`
4. **Create `src/schemas/onboarding.ts`** — schema for `OnboardingData`

5. **Modify `src/hooks/usePersistedState.ts`**:
   - Add optional 3rd param: `schema?: z.ZodType<T>`
   - Use `schema.safeParse()` when provided; fallback to `defaultValue` on failure
   - Keep backward compat (schema is optional)

6. **Modify contexts** to use schemas in their row parsers:
   - `ListingsContext.tsx` → `rowToListing()` uses `listingSchema.safeParse()`, skip invalid rows
   - `AlertsContext.tsx` → `rowToAlert()` uses `alertSchema.safeParse()`
   - `OnboardingContext.tsx` → validate in `loadData()`
   - `ViewedContext.tsx` → validate with `z.array(z.string())`
   - `NotificationsContext.tsx` → validate localStorage parse

7. **Modify `src/data/listings.ts`** — derive `Listing` type from `z.infer<typeof listingSchema>`

8. Run `npm run build` — must pass

---

## Phase 3: Zustand Migration (one store at a time)

**Goal**: Replace 7 Context providers with Zustand stores. Same public hook API.

**Pattern for each migration:**
1. Create `src/stores/xxxStore.ts` with Zustand `create()`
2. Update `src/context/XxxContext.tsx` to re-export the store hook as `useXxx`
3. Remove `<XxxProvider>` from `src/App.tsx`
4. Run `npm run build`

### 3a: ViewedStore (simplest, zero deps)
- **Create `src/stores/viewedStore.ts`** — `viewedIds`, `markViewed()`, `isViewed()`
- Uses `storage.getItem/setItem` directly

### 3b: OnboardingStore (zero deps)
- **Create `src/stores/onboardingStore.ts`** — `data`, `setData()`
- Reads/writes localStorage via storage adapter

### 3c: NotificationsStore (FIX: race condition)
- **Create `src/stores/notificationsStore.ts`** — `prefs`, `setPref()`
- **Fix**: Initialize from localStorage (sync). On login, fetch from Supabase and merge (remote wins). Local changes propagate to Supabase.

### 3d: SavedStore (FIX: fire-and-forget)
- **Create `src/stores/savedStore.ts`** — `savedIds`, `toggleSave()`, `isSaved()`
- **Fix**: `toggleSave()` awaits Supabase writes. On error, reverts optimistic state.

### 3e: AuthStore
- **Create `src/stores/authStore.ts`** — `session`, `user`, `loading`, `signUp`, `signIn`, `signInWithGoogle`, `signOut`
- `onAuthStateChange` + visibility listener in store initializer

### 3f: ListingsStore
- **Create `src/stores/listingsStore.ts`** — `listings`, `loading`, `refreshing`, `newCount`, `refresh()`, `clearNewCount()`
- Realtime subscription in store initializer
- Extract `rowToListing`, `blendListings` to `src/lib/listings.ts`

### 3g: AlertsStore (FIX: re-render cascade + fire-and-forget)
- **Create `src/stores/alertsStore.ts`** — `alerts`, `addAlert`, `updateAlert`, `removeAlert`, `unreadCount`, `markAllRead`
- **Fix cascade**: `unreadCount` derived inside store via `useListingsStore.subscribe()`. BottomNav uses `useAlertsStore(s => s.unreadCount)` — only re-renders when count changes.
- **Fix fire-and-forget**: CRUD operations await Supabase with error rollback.

**After 3g**: `src/App.tsx` has ZERO nested providers.

---

## Phase 4: TanStack Query

**Goal**: Cache, retry, auto loading/error states for Supabase data.

### Steps

1. **Create `src/lib/queryClient.ts`** — `QueryClient` with `staleTime: 5min`, `retry: 2`, `refetchOnWindowFocus: true`

2. **Create query hooks:**
   - `src/queries/listings.ts` — `useListingsQuery()` wrapping fetch from Supabase
   - `src/queries/alerts.ts` — `useAlertsQuery(userId)` + `useAddAlertMutation()`, `useUpdateAlertMutation()`, `useRemoveAlertMutation()` with optimistic updates
   - `src/queries/saved.ts` — `useSavedQuery(userId)` + `useToggleSaveMutation()`

3. **Modify `src/App.tsx`** — add `<QueryClientProvider>`

4. **Simplify stores:**
   - `listingsStore` → keeps `newCount`, `clearNewCount`, Realtime sub updates query cache via `queryClient.setQueryData()`
   - `alertsStore` → keeps `seenIds`, `markAllRead`, `unreadCount` derivation
   - `savedStore` → thin wrapper, data from query

5. **Update page consumers** to use query hooks:
   - `RoomsPage.tsx` — `useListingsQuery()` for data/loading/error
   - `LikedPage.tsx` — `useSavedQuery()`
   - `ChatsPage.tsx` — `useAlertsQuery()`

6. Run `npm run build` — must pass

---

## Phase 5: Bug Fixes

### 5a: usePushNotifications memory leak
- **Modify `src/hooks/usePushNotifications.ts`**
- Use `useRef` for user instead of closing over it
- Remove `saveToken`/`removeToken` from useEffect deps

### 5b: Analytics error logging
- **Modify `src/lib/analytics.ts`**
- Add `console.warn('[Analytics]', event, err)` in dev mode (`import.meta.env.DEV`)

### 5c: Storage hydration safety
- **Modify `src/lib/storage.ts`**
- Add `hydrated: boolean` flag, warn if `getItem` called before hydration

---

## Phase 6: Database Improvements

### 6a: Composite indexes
- **Create `supabase/migrations/XXX_add_composite_indexes.sql`**:
  ```sql
  CREATE INDEX IF NOT EXISTS listings_alert_match_idx ON listings (is_active, city, price, type);
  CREATE INDEX IF NOT EXISTS push_tokens_user_platform_idx ON push_tokens (user_id, platform);
  CREATE INDEX IF NOT EXISTS listings_digest_idx ON listings (created_at DESC, is_active);
  ```

### 6b: Fix analytics RLS
- **Create migration**: replace `WITH CHECK (true)` with `WITH CHECK (auth.uid() = user_id OR user_id IS NULL)`

### 6c: Edge Function hardening
- `notify-new-listings/index.ts` — validate payload, restrict CORS, verify auth header
- `send-welcome-email/index.ts` — validate email format, restrict CORS
- `daily-digest/index.ts` — replace N+1 `getUserById` with batch `listUsers()`

---

## Phase 7: CI/CD

1. **Create `.github/workflows/ci.yml`** — on push/PR: typecheck + build
2. **Create `.github/workflows/deploy-edge-functions.yml`** — deploy on `supabase/functions/**` changes
3. **Modify `.github/workflows/scrape.yml`** — add post-scrape health check

---

## Verification Checklist (after each phase)

- [ ] `npm run build` passes (zero errors)
- [ ] `npm run typecheck` passes (after Phase 0)
- [ ] App loads without crash
- [ ] Visual appearance is identical (no style changes)
- [ ] Core flows work: swipe deck, save listing, create alert, notifications
