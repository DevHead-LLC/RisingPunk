# User Login Flow

## Step 1: User Login Flow

**1. User Experience Behavior:**
- User enters handle and access key in login form
- User clicks "JACK_IN" button
- App validates credentials and shows loading state
- Upon successful authentication, user is automatically taken to the Turf Screen (main game interface)

**2. Feature Description:**
- **Authentication flow**: login validation and token management
  - [`../src/screens/LoginScreen.tsx`](../src/screens/LoginScreen.tsx) - UI form and validation logic
  - [`../src/store/slices/authSlice.ts`](../src/store/slices/authSlice.ts) - Redux state management for auth
  - [`../src/store/api/authApi.ts`](../src/store/api/authApi.ts) - RTK Query API calls to server
  - [`../../server/src/routes/auth.ts`](../../server/src/routes/auth.ts) - Server endpoint for credential validation
  - [`../../server/src/models/User.ts`](../../server/src/models/User.ts) - User model with password verification
- **Navigation routing**: conditional rendering based on auth state
  - [`../src/components/AppContent.tsx`](../src/components/AppContent.tsx) - Main routing logic based on token presence
  - [`../src/store/slices/authSlice.ts`](../src/store/slices/authSlice.ts) - Provides token state to AppContent
  - [`../src/screens/TurfScreen.tsx`](../src/screens/TurfScreen.tsx) - Destination screen after successful login
- **Initial data fetching**: balance, bots, and build state after successful login
  - [`../src/store/slices/authSlice.ts`](../src/store/slices/authSlice.ts) - Triggers data fetching after login
  - [`../src/store/api/balanceApi.ts`](../src/store/api/balanceApi.ts) - Fetches user balance data
  - [`../src/store/api/botsApi.ts`](../src/store/api/botsApi.ts) - Fetches user bots and build state
  - [`../src/store/slices/balanceSlice.ts`](../src/store/slices/balanceSlice.ts) - Stores balance state
  - [`../src/store/slices/botsSlice.ts`](../src/store/slices/botsSlice.ts) - Stores bots and build state

**3. Source of Truth:**
- **Auth State**: [`../src/store/slices/authSlice.ts`](../src/store/slices/authSlice.ts) - stores token, user data, loading state
- **Navigation Logic**: [`../src/components/AppContent.tsx`](../src/components/AppContent.tsx) - determines which screen to show based on token presence
- **Server Auth**: [`../../server/src/routes/auth.ts`](../../server/src/routes/auth.ts) - validates credentials and returns JWT token

**4. Code Location Analysis:**
- **Current Location**: 
  - Client-side: LoginScreen component, AppContent routing logic, Redux auth slice
  - Server-side: Auth routes, User model validation
- **Should Live**: 
  - **Client-side**: UI components, local state management, token storage
  - **Server-side**: Credential validation, JWT generation, user data verification
  - **Evaluation**: Correctly placed - authentication validation must be server-side for security, while UI and token storage are appropriately client-side 