# Turf to Home Navigation

## Step 2: Turf to Home Navigation

**1. User Experience Behavior:**
- User sees the Turf Screen with various location icons (Home, Digital Barracks, Profile)
- User clicks on the "HOME" location icon (house icon with "HOME" label)
- Screen transitions from TurfScreen to HomeScreen, showing the Hack Rig and Bot Assembly modules

**2. Feature Description:**
- **Turf Screen navigation**: Main game hub with location-based navigation
  - [`../src/screens/TurfScreen.tsx`](../src/screens/TurfScreen.tsx) - Main turf screen with location icons and navigation logic
  - [`../src/components/turf/HomeLocation.tsx`](../src/components/turf/HomeLocation.tsx) - Home location button component with onPress handler
  - [`../src/screens/HomeScreen.tsx`](../src/screens/HomeScreen.tsx) - Destination screen showing Hack Rig and Bot Assembly
- **Screen state management**: Internal navigation using useState
  - [`../src/screens/TurfScreen.tsx`](../src/screens/TurfScreen.tsx) - Uses `currentScreen` state to control which screen is displayed
  - [`../src/screens/TurfScreen.tsx`](../src/screens/TurfScreen.tsx) - `navigateToScreen` callback function handles screen transitions
- **Home Screen layout**: Displays game modules for user interaction
  - [`../src/screens/HomeScreen.tsx`](../src/screens/HomeScreen.tsx) - Renders HackRigDisplay and BotAssembly components
  - [`../src/components/home/HackRigDisplay.tsx`](../src/components/home/HackRigDisplay.tsx) - Hack Rig module with battle navigation
  - [`../src/components/home/BotAssembly.tsx`](../src/components/home/BotAssembly.tsx) - Bot Assembly module for bot building

**3. Source of Truth:**
- **Navigation State**: [`../src/screens/TurfScreen.tsx`](../src/screens/TurfScreen.tsx) - `currentScreen` state controls which screen is displayed
- **Screen Components**: [`../src/screens/HomeScreen.tsx`](../src/screens/HomeScreen.tsx) - Contains the home screen layout and module components
- **Location Components**: [`../src/components/turf/HomeLocation.tsx`](../src/components/turf/HomeLocation.tsx) - Handles the home location button press

**4. Code Location Analysis:**
- **Current Location**: 
  - Client-side: All navigation logic, screen components, and UI state management
  - No server-side components involved in this navigation step
- **Should Live**: 
  - **Client-side**: UI navigation, screen transitions, component rendering
  - **Server-side**: None required for this step
  - **Evaluation**: Correctly placed - this is purely client-side UI navigation that doesn't require server validation or anti-cheat measures 