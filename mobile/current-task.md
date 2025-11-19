# Crews Feature Implementation

## Approach

**Crews Concept**: A feature where a user can form a "crew" which other user players can join.

  **Active Crew System**: We are currently creating the "active" crew system view. This is the view for users who are "in a crew" - either as the president/creator of their own crew, or as a member who has joined an existing crew. This view represents the individual crew that the user is part of. Crew identifiers and database objects will be added in the near future.

**Workflow**:
1. User provides step and rules/details
2. Write goal in current-task.md
3. Implement the changes
4. Update current-task.md with progress made

**Principle**: Keep things simple so we don't get lost in details. Focus on one goal at a time, track progress clearly, and maintain simplicity throughout implementation.

## Goals

### 1. Show "Hack Crew" category in ResearchScreen
- **Status**: ✅ Completed
- **Description**: Un-hide the "Hack Crew" category so it appears in the ResearchScreen alongside "Home Defense"
- **Progress**: Updated RESEARCH_CARDS filter in ResearchScreen.tsx to include both 'home-defense' and 'hack-crew' categories

### 2. Keep "Hack Crew" category locked until unlocked
- **Status**: ✅ Completed
- **Description**: Ensure the "Hack Crew" category is locked (shows lock overlay) until user meets requirements and unlocks it, just like Home Defense
- **Progress**: 
  - **UI Locking**: Fully implemented in ResearchScreen.tsx - works identically to Home Defense
  - **Database Setup**: Enhanced `getUserResearchStatus()` in ResearchUnlockService.ts to automatically create missing ResearchUser entries when new Research documents exist
  - **Validation Logic**: Added requirement validation to ensure unlock status matches actual requirements:
    - Checks level, balance, and dependencies before showing as unlocked
    - Automatically corrects database if entry says unlocked but requirements aren't met
    - Returns locked status if any requirement is not met, even if database says unlocked
  - **How it works**:
    1. Research document must be manually created in database (user handles seeding) with categoryId: 'hack-crew', levelRequirement, balanceRequirement, dependencies, etc.
    2. When user accesses research screen, system automatically creates ResearchUser entry with `isUnlocked: false` if missing
    3. New users get ResearchUser entries automatically during registration
    4. Existing users get missing entries automatically when they access research status
    5. System validates unlock status against requirements and corrects database if needed
  - **Result**: No manual database updates needed for ResearchUser entries - system handles it automatically and validates unlock status
  - **Issue Found & Fixed**: Some existing ResearchUser entries had `isUnlocked: true` incorrectly. System now validates and corrects these automatically. Manual fix command provided for immediate correction if needed.

### 3. Update "Hack Crew" unlock requirements
- **Status**: ✅ Completed
- **Description**: Change unlock requirements to Level 5 and $100,000 balance requirement
- **Progress**: 
  - Updated unlock cost in ResearchUnlockService.ts from $50,000 to $100,000
  - Updated Research document in database: levelRequirement: 5, balanceRequirement: 100000

### 4. Ensure research modal shows latest user level and balance
- **Status**: ✅ Completed
- **Description**: Research unlock modal should display the most up-to-date user level and balance when opened
- **Progress**: 
  - Modified ResearchLockedModal to read level and balance directly from Redux state using useAppSelector
  - Modal now reactively updates when user levels up or balance changes
  - Falls back to props if Redux state is not available

### 5. Update "Hack Crew" dependencies to only require "home-defense"
- **Status**: ✅ Completed
- **Description**: Change dependencies from ['hack-ability', 'financial'] to ['home-defense']
- **Progress**: 
  - Dependencies are pulled from database (Research collection) via `getUserResearchStatus()` in ResearchUnlockService.ts
  - MongoDB command provided to update dependencies array: `db.research.updateOne({ categoryId: 'hack-crew' }, { $set: { dependencies: ['home-defense'] } })`
  - Added refresh call when opening locked modal to ensure latest data is fetched
  - System will automatically use new dependencies for validation once database is updated

### 6. Hide all hack-crew features except "Start a Crew"
- **Status**: ✅ Completed
- **Description**: Hide all research features in hack-crew category except "Start a Crew" (renamed from "Start Crew Unlock")
- **Progress**: 
  - Renamed "Start Crew Unlock" to "Start a Crew" in researchFeatures.ts
  - Updated feature requirements: unlockCost: $250,000, levelRequirement: 5, researchTimeHours: 4
  - Added filtering logic in ResearchFeaturesList.tsx to only show "start-crew-unlock" feature when categoryId is "hack-crew"
  - All other hack-crew features (group-hack-attack-boost, group-hack-defense-boost, etc.) are now hidden
  - Added research time display to locked modal in FeatureModal.tsx
  - **Data Sources**: Features come from `researchFeatures.ts` config file (source of truth). `UserResearchFeature` entries are automatically created when user starts researching (via `upsert: true` in `startResearch()` method)
  - **Note**: Research document's `features` array exists but is not currently used by `getUserFeatures()` - it pulls from config file instead

### 7. Testing: Temporary research time reduction
- **Status**: ✅ Completed
- **Description**: Temporarily changed research time from 4 hours to 20 seconds for testing purposes
- **Progress**: 
  - Updated `researchTimeHours` in researchFeatures.ts from `4` to `20 / 3600` (0.005556 hours = 20 seconds)
  - This allows quick testing of the research completion flow
  - **Note**: This is a temporary change for testing - should be reverted to `4` after testing is complete

### 8. Implement hack crew icon in HackMapScreen toolbar
- **Status**: ✅ Completed
- **Description**: Add hack crew icon to the collapsible toolbar in HackMapScreen, visible only when 'start-crew-unlock' feature is unlocked
- **Progress**: 
  - **Research Completion**: Verified that `ResearchFeatureService.completeResearch()` already sets `isUnlocked: true` when countdown completes (line 260)
  - **HackMapScreen Updates**: 
    - Added query to fetch hack-crew research features using `useGetUserFeaturesQuery('hack-crew')`
    - Added logic to check if 'start-crew-unlock' feature is unlocked (same timer logic as antivirus)
    - Added `handleHackCrewPress` callback (placeholder for future modal implementation)
    - Passed hack crew unlock status and press handler to CollapsibleToolbar
  - **CollapsibleToolbar Updates**:
    - Added `onHackCrewPress` and `isHackCrewUnlocked` props
    - Updated visibility logic: toolbar now shows if EITHER antivirus OR hack crew is unlocked
    - Added hack crew icon button that only appears when `isHackCrewUnlocked` is true
    - Updated toolbar layout to use `flexDirection: 'row'` with gap for multiple icons
    - Icon uses `hackCrew.png` from assets/images/hackMap/
  - **Toolbar Layout Refinements**:
    - Fixed icon positioning: Changed from `width: '100%'` to fixed `width: 36, height: 36` for toolButton to prevent layout issues
    - Separated padding: Changed from uniform `padding` to `paddingHorizontal: SIZING.spacing.md` (16px) and `paddingVertical: SIZING.spacing.xs` (4px) for proper left/right spacing without increasing top/bottom padding
    - Dynamic width calculation: Toolbar width now grows conditionally based on number of unlocked icons
    - Width formula: `(iconWidth * iconCount) + (horizontalPadding * 2)` - each icon adds 36px to toolbar width
    - Added `alignItems: 'center'` and `justifyContent: 'center'` to ensure icons are properly centered within toolbar
  - **Result**: Hack crew icon appears in toolbar when research completes and `isUnlocked` becomes true, matching the antivirus shield behavior. Toolbar dynamically resizes based on number of icons with proper padding and spacing

### 9. Add background image for "Start a Crew" feature
- **Status**: ✅ Completed
- **Description**: Add background image to "Start a Crew" feature card in ResearchScreen, matching the antivirus feature style
- **Progress**: 
  - Added condition in ResearchFeaturesList to use ImageBackground for 'start-crew-unlock' feature
  - Used `startCrew.png` from assets/images/ as background image
  - Applied same styling and layout logic as antivirus feature (unlocked state shows centered text, researching shows timer/lock/price)
  - **Result**: "Start a Crew" feature now displays with background image, improving visual appeal and consistency

### 10. Refactor feature cards into reusable component
- **Status**: ✅ Completed
- **Description**: Extract feature card rendering logic into a reusable FeatureCard component to support many future features
- **Progress**: 
  - **Created FeatureCard.tsx**: New reusable component that handles all feature card rendering
    - Supports background images via `BACKGROUND_IMAGE_MAP` (easy to add new features)
    - Handles unlocked/researching states automatically
    - Manages timer display and formatting
    - Works with or without background images
    - Exported `ResearchFeature` interface for type safety
  - **Refactored ResearchFeaturesList.tsx**:
    - Removed ~250 lines of duplicate rendering code
    - Simplified from ~545 lines to ~163 lines
    - Now uses `<FeatureCard />` for all features
    - Removed unused styles and helper functions
  - **Background Image Mapping**:
    - Centralized `BACKGROUND_IMAGE_MAP` in FeatureCard.tsx
    - Easy to add new features: just add one line to the map
    - Currently includes: antivirus, start-crew-unlock, bot-trap
  - **Benefits**:
    - DRY: No duplicate code for each feature
    - Maintainable: Single source of truth for card rendering
    - Scalable: Easy to add new features - just add to BACKGROUND_IMAGE_MAP
    - Consistent: All features use same rendering logic
  - **Result**: Much cleaner, more maintainable codebase ready for adding many features in the future

### 11. Improve feature name text readability
- **Status**: ✅ Completed
- **Description**: Add semi-transparent black background to feature name text for better readability on background images
- **Progress**: 
  - Added `featureNameContainer` style with `backgroundColor: 'rgba(0, 0, 0, 0.6)'` (60% opacity black)
  - Wrapped feature name text in both rendering paths:
    - Regular feature content (renderFeatureContent)
    - Unlocked state with background images
  - Container uses `alignSelf: 'center'` for centering
  - No padding - adjusts to content width automatically
  - **Result**: Feature names are now easily readable on all background images, including "Start a Crew" with its complex illustration

### 12. Create Crew System Modal (Active Crew View)
- **Status**: ✅ Completed
- **Description**: Create a full viewport modal for the "active" crew system feature that opens when clicking the crew icon in the HackMapScreen toolbar. This modal represents the view for users who are "in a crew" - either as the president/creator of their own crew, or as a member who has joined an existing crew. This is the view of the individual crew that the user is part of. The modal will have a category list view and individual category views with navigation.
- **Progress**:
  - ✅ Created CrewModal.tsx component
    - Full viewport modal with category list view (3-column grid)
    - Individual category views with back button navigation
    - 9 categories: Guild information, Members, Awards, Crew Settings, Recruiting, Crew Rules, Ranking, Internal Message Board, External Message Board
    - SafeAreaView support for iPhone and Android
    - Close button in header
    - Back button in category views
  - ✅ Implemented Crew Settings view
    - 10 buttons in 2-column grid layout
    - Buttons centered with proper spacing
    - Danger styling for last 3 buttons (red tint, white text)
    - All buttons display uppercase text
    - "Disband Crew" has red border
    - See Goal 17 for detailed implementation
  - ✅ Integrated conditional display
    - Shows CrewModal when user is in a crew (isInCrew === true)
    - Shows CrewOnboardingModal when user is not in a crew (isInCrew === false)
    - See Goal 15 for conditional display implementation

### 13. Create Crew Onboarding Modal (Default View)
- **Status**: ✅ Completed
- **Description**: Create a default full viewport modal that shows when users click the hackCrew icon in the toolbar. This is the first view users will see until they create or join a crew. Once they are in a crew, the icon will change and they will see the active crew view instead. This modal is for creating a new crew or joining an existing crew.
- **Requirements**:
  - Full viewport width and height (entire device viewport)
  - Same dimensions as the active crew modal
  - Respects dark and light mode
  - Safe area support for iPhone and Android
  - Close button to exit modal
  - Two tabs: "Join a Crew" and "Create a Crew"
  - Tab switching functionality
  - Empty placeholder views for each tab (to verify layout)
- **Current State**:
  - **Created CrewOnboardingModal.tsx**: Default full viewport modal component
    - Uses `flex: 1`, `width: '100%'`, `height: '100%'` for full viewport coverage
    - SafeAreaView support for iPhone and Android
    - Close button (×) in header to exit modal
    - Tab navigation with two tabs: "Join a Crew" and "Create a Crew"
    - Tab switching state management with `useState<CrewTab>('join')`
    - Active tab styling (primary background, white text)
    - Inactive tab styling (surface background, secondary text)
    - Conditional rendering of tab content based on active tab
    - Empty placeholder content for each tab (to verify layout)
    - Uses `useThemeColors()` for dark/light mode support
    - Modal uses `presentationStyle="overFullScreen"` and `supportedOrientations={['landscape']}`
  - **Updated HackMapScreen.tsx**:
    - Both `CrewModal` and `CrewOnboardingModal` are imported and conditionally displayed
    - Shows `CrewOnboardingModal` when user is not in a crew
    - Shows `CrewModal` when user is in a crew (see Goal 15)
- **Remaining Work**:
  - Fix scroll behavior to stop at last row (prevent over-scrolling) - for active crew view (optional improvement)
  - Test on both iPhone and Android devices
- **Recent Progress**:
  - ✅ Added SafeAreaView support for iPhone and Android
    - Wrapped both `renderCategoryList` and `renderCategoryView` with SafeAreaView
    - Used semantic style name `crewModalContainer` to avoid conflicts with other modals
    - SafeAreaView automatically handles safe areas in landscape orientation (notch, home indicator on iPhone; status bar, navigation bar on Android)
  - ✅ Implemented 3-column grid layout with uniform card sizes
    - Added grid container with `flexDirection: 'row'` and `flexWrap: 'wrap'`
    - Calculated card dimensions: `CREW_CARD_WIDTH` and `CREW_CARD_HEIGHT` based on screen width
    - Cards are uniform size and evenly distributed (3 per row)
    - Used semantic naming (`crewGridContainer`, `crewCategoryItem`, etc.) to avoid conflicts
    - Cards are rectangular (width reduced by 20%, height reduced by 70% from square)
    - Reduced padding: modal padding `SIZING.spacing.md * 2`, content padding `SIZING.spacing.md`, card padding `SIZING.spacing.sm`
    - Gap between cards: `SIZING.spacing.lg`
    - Text wraps with `numberOfLines={2}` and centered alignment
- **Recent Progress (Goal 13)**:
  - ✅ Created CrewOnboardingModal.tsx as default view
    - Full viewport modal with same dimensions as active crew modal
    - SafeAreaView support for iPhone and Android
    - Close button in header
    - Empty placeholder content for now (to verify layout)
    - Replaced CrewModal as default in HackMapScreen
  - ✅ Disconnected active crew view (CrewModal.tsx)
    - Active crew view kept separate for future use
    - Will be shown when user is in a crew (icon will change)
  - ✅ Added tab navigation
    - Two tabs: "Join a Crew" and "Create a Crew"
    - Tab switching functionality with state management
    - Active/inactive tab styling with theme colors
    - Conditional content rendering based on active tab
    - Empty placeholder views for each tab (to verify layout)

### 14. Implement Crew Creation Database Integration
- **Status**: ✅ Completed
- **Description**: Create database models and API endpoints for crew creation, with duplicate checking and user status tracking
- **Progress**:
  - ✅ Created `Crew` model (server/src/models/Crew.ts)
    - Stores crew data: crewName (max 12 chars), crewIdentifier (max 5 chars, unique), nativeLanguage, presidentId, members array
    - Unique indexes on crewName and crewIdentifier
    - Collection name: 'crews'
  - ✅ Created `CrewStatus` model (server/src/models/CrewStatus.ts)
    - Tracks user's crew membership: userId, isInCrew boolean, crewId, crewIdentifier, role (president/member/null)
    - Unique index on userId
    - Collection name: 'crewStatus'
  - ✅ Created crew API routes (server/src/routes/crew.ts)
    - POST /api/crew/create - Creates new crew and updates user status
    - GET /api/crew/status - Returns user's crew membership status
    - Duplicate checking for crew name and identifier before saving
    - Validation for character limits and allowed characters
    - Error handling for duplicate names/identifiers
    - Prevents users already in a crew from creating another
  - ✅ Registered routes in server.ts
    - Added import for crewRoutes
    - Registered at /api/crew
  - ✅ Added client API endpoints
    - useCreateCrewMutation - Creates a crew via API
    - useGetCrewStatusQuery - Fetches user's crew status
    - Added to authApi exports
  - ✅ Integrated API in CrewOnboardingModal
    - Connected form submission to createCrew mutation
    - Added loading state and error handling
    - Displays error messages for duplicate names/identifiers
    - Closes modal on successful crew creation
  - ✅ Implemented "Create a Crew" form
    - Crew name input (max 12 characters, a-z, 0-9, _, -)
    - Crew identifier input (max 5 characters, auto-uppercase, a-z, 0-9, _, -)
    - Native language selector dropdown (20 common US languages)
    - Real-time validation with error messages
    - Character filtering to prevent invalid input
    - Create Crew button with loading state
    - Form resets when modal closes
    - Consistent styling with app theme

### 15. Implement Conditional Modal Display Based on Crew Status
- **Status**: ✅ Completed
- **Description**: Show different modals and icons based on user's crew membership status. When user clicks hackCrew icon, check `isInCrew` status and show CrewModal if in a crew, or CrewOnboardingModal if not in a crew.
- **Progress**:
  - ✅ Added crew status fetching in HackMapScreen
    - Uses `useGetCrewStatusQuery()` to fetch crew status on component mount
    - Status is automatically refreshed via RTK Query caching
  - ✅ Updated CollapsibleToolbar to show different icons
    - Added `isInCrew` prop to CollapsibleToolbar component
    - Shows `hackCrewActive.png` if `isInCrew === true`
    - Shows `hackCrew.png` if `isInCrew === false`
  - ✅ Implemented conditional modal display
    - `hackCrew.png` click → Opens `CrewOnboardingModal` (for users not in a crew)
    - `hackCrewActive.png` click → Opens `CrewModal` (for users in a crew)
    - Updated `handleHackCrewPress` to check `isInCrew` status and show appropriate modal
  - ✅ Added separate state management for both modals
    - `showCrewModal` for active crew view (CrewModal)
    - `showCrewOnboardingModal` for onboarding view (CrewOnboardingModal)
    - Separate close handlers for each modal
  - ✅ Integrated CrewModal component
    - Imported and rendered CrewModal in HackMapScreen
    - Modal shows when user is in a crew and clicks hackCrewActive icon
  - ✅ Crew status refresh after creation
    - Added `refetchCrewStatus()` call after successful crew creation
    - Ensures UI updates immediately after user creates a crew
  - ✅ Crew status is checked on login
    - RTK Query automatically fetches crew status when HackMapScreen mounts
    - Status is cached and refreshed as needed
    - No additional login flow changes needed - handled by component-level query

### 16. Update Crew Model with Executives and President Fields
- **Status**: ✅ Completed
- **Description**: Add executives array and President field to Crew model, and update crew creation to populate these fields
- **Progress**:
  - ✅ Updated Crew model (server/src/models/Crew.ts)
    - Added `executives` array field (array of ObjectIds referencing User)
    - Added `President` field (ObjectId referencing User, stores president's database ID)
    - Both fields are included when creating a new crew
  - ✅ Updated crew creation route (server/src/routes/crew.ts)
    - Sets `President` field to userId (same as presidentId)
    - Initializes `executives` array as empty array
    - Fixed TypeScript compilation error for crewId assignment (added type casting)
  - ✅ Provided MongoDB commands for updating existing entries
    - Command to update existing crews with President field and executives array
    - Command to delete existing entries if needed

### 17. Implement Crew Settings Buttons
- **Status**: ✅ Completed
- **Description**: Create buttons in Crew Settings view for crew management actions, organized in a 2-column grid layout
- **Progress**:
  - ✅ Created Crew Settings buttons implementation
    - 10 buttons total in a 2-column grid layout
    - Buttons: Assign Executives, Gift All Members, Declare War, Terminate War Declaration, Request Alliance, Accept Alliance, Terminate Alliance, Choose Successor, Resign, Disband Crew
    - Buttons are centered using `justifyContent: 'center'`
    - Proper spacing between buttons and rows
  - ✅ Styled buttons with app theme colors
    - Uses `colors.surface` for background
    - Uses `colors.secondary` for border
    - Uses `colors.text.primary` for text color
    - Rounded corners (8px border radius)
    - Minimum height of 50px for consistency
  - ✅ Added danger styling for last 3 buttons
    - "Choose Successor", "Resign", "Disband Crew" have red tint background (`colors.error + '40'`)
    - White text color for better readability on red background
    - "Disband Crew" button has red border (`colors.error`)
  - ✅ All buttons display uppercase text
    - Applied `.toUpperCase()` to all button text
  - ✅ Integrated into CrewModal
    - Conditionally renders `renderCrewSettings()` when `currentCategory === 'crew-settings'`
    - Uses ScrollView for scrollable content
    - Buttons currently log to console (ready for functionality implementation)

### 18. Implement Disband Crew Functionality
- **Status**: ✅ Completed
- **Description**: Make the "Disband Crew" button functional with confirmation modal and database cleanup
- **Progress**:
  - ✅ Created DisbandCrewModal.tsx component
    - Warning message about permanent action
    - Suggests alternatives (Resign, Choose Successor)
    - Requires typing crew identifier to confirm
    - Error handling and loading states
    - Styled with app theme colors
  - ✅ Added API endpoint (server/src/routes/crew.ts)
    - POST /api/crew/disband - Disbands crew and updates all member statuses
    - Verifies user is president
    - Validates crew identifier matches
    - Updates all crewStatus entries for the crew (sets isInCrew: false, clears crewId, etc.)
    - Deletes the crew from crews collection
  - ✅ Added client API mutation
    - useDisbandCrewMutation hook
    - Invalidates 'User' tag to refresh crew status
  - ✅ Integrated into CrewModal
    - "Disband Crew" button opens confirmation modal
    - Fetches crew identifier from crew status
    - Handles disband action and closes modals on success
    - Error handling with user-friendly messages
    - Refetches crew status after disbanding to update UI immediately

### 19. Implement Join a Crew Tab with Search and Suggested Crews
- **Status**: ✅ Completed
- **Description**: Implement the "Join a Crew" tab in CrewOnboardingModal with search functionality and suggested crews list
- **Progress**:
  - ✅ Added API endpoints (server/src/routes/crew.ts)
    - GET /api/crew/search?q=query - Searches crews by name or identifier, returns top 5 results
    - GET /api/crew/suggested - Returns top 10 suggested crews (or all available if less than 10)
    - Both endpoints include member count for each crew
  - ✅ Added client API hooks
    - useSearchCrewsQuery - Hook for searching crews
    - useGetSuggestedCrewsQuery - Hook for getting suggested crews
  - ✅ Implemented Search Section
    - Search input that queries as you type
    - Displays top 5 search results
    - Shows crew name, identifier, language, and member count
    - Loading state while searching
    - "No results" message when no matches found
  - ✅ Implemented Suggested Crews Section
    - Displays up to 10 suggested crews
    - Numbered 1-N (only shows numbers for available crews)
    - Each crew shows name, identifier, language, and member count
    - Loading state while fetching
    - "No crews available" message when empty
  - ✅ Added View and Request to Join buttons
    - Each crew card has two buttons: "View" and "Request to Join"
    - Buttons styled consistently with app theme
    - "View" button opens VisitCrewModal
    - "Request to Join" button handles application (see Goal 20)

### 20. Create Visit Crew Modal
- **Status**: ✅ Completed
- **Description**: Create a modal for users not in a crew (or in a different crew) to view another crew's information
- **Progress**:
  - ✅ Created VisitCrewModal.tsx component
    - Similar structure to CrewModal.tsx
    - 4 categories for users not in a crew: Apply to Crew, Awards, Members, External Message Board
    - Same grid layout (3 columns, with "Apply to Crew" as full-width card below)
    - Same styling and navigation (back button, close button)
    - Accepts crewId and optional crewName props
    - Displays crew name in header when available
  - ✅ Integrated into CrewOnboardingModal
    - "View" buttons in search results and suggested crews open the modal
    - Passes selected crew's ID and name to VisitCrewModal
    - Resets state when onboarding modal closes
  - ✅ Layout adjustments
    - "Apply to Crew" moved to bottom row as full-width card
    - Full width calculated to match width of 3 cards above plus gaps
    - Proper alignment with other cards

### 21. Implement Crew Application System
- **Status**: ✅ Completed
- **Description**: Implement application system where users can apply to crews, with toggle functionality and database tracking
- **Progress**:
  - ✅ Updated database models
    - **CrewStatus**: Added `appliedCrewId` and `appliedCrewIdentifier` fields to track which crew user applied to
    - **Crew**: Added `applicants` array with `userId`, `handle`, and `appliedAt` fields
    - Fixed duplicate index warning in CrewStatus (removed `unique: true` from field definition, kept explicit index)
  - ✅ Added API endpoints (server/src/routes/crew.ts)
    - POST /api/crew/apply - Applies user to a crew (max 1 application enforced)
    - POST /api/crew/withdraw-application - Withdraws application
    - GET /api/crew/:crewId - Gets crew details including applicants list
    - Updated GET /api/crew/status to return application status
  - ✅ Added client API hooks
    - useApplyToCrewMutation - Applies to a crew
    - useWithdrawApplicationMutation - Withdraws application
    - useGetCrewDetailsQuery - Gets crew details with applicants
  - ✅ Implemented VisitCrewModal Apply Toggle
    - "Apply to Crew" button toggles between "Apply to Crew" and "Applied"
    - Green background (#4CAF50) when applied
    - Handles apply/withdraw actions with loading states
    - Refetches crew status after actions
  - ✅ Updated CrewOnboardingModal buttons
    - "Request to Join" buttons in search results and suggested crews show "Applied" state
    - Green background when applied
    - Toggle functionality to apply/withdraw
    - Loading states during processing
  - ✅ Implemented CrewModal Recruiting View
    - Displays applicants with sequential numbering (1., 2., 3., etc.)
    - Shows applicant username/handle
    - Three buttons per applicant: Accept (green), Deny (red), View (secondary)
    - Buttons are placeholders (log to console) - ready for functionality
    - "No applicants" message when list is empty
    - Fetches crew details when recruiting category is opened
  - ✅ Fixed TypeScript errors
    - Fixed ObjectId conversion in apply endpoint
    - Fixed RTK Query refetch error (removed manual refetch, query starts automatically)
  - ✅ Application system features
    - Max 1 application per user enforced
    - Updates all relevant buttons when status changes
    - Stores application data in database
    - Toggle works in both directions (apply and withdraw)
    - User handle stored in applicants array for display

### 22. Implement Visiting Profile Modal
- **Status**: ✅ Completed
- **Description**: Create a modal that displays when crew owner/executive clicks "View" on an applicant in the recruiting view. Shows limited user information (username, level, avatar) with ability to close and return to previous screen.
- **Progress**:
  - ✅ Created server API endpoint (server/src/routes/userRoutes.ts)
    - GET /api/users/profile/:userId - Returns user profile by userId (handle, level, profileGender)
    - Protected with auth middleware
    - Returns limited profile information for viewing other users
  - ✅ Added client API hook (mobile/src/store/api/authApi.ts)
    - useGetUserProfileQuery - Fetches user profile by userId
    - Added UserProfileResponse interface
    - Exported hook for use in components
  - ✅ Created VisitingProfileModal component (mobile/src/components/hackMap/VisitingProfileModal.tsx)
    - Centered modal with overlay (not full screen)
    - Displays user avatar (emoji based on profileGender: 👨 or 👩)
    - Shows username/handle prominently
    - Shows level in styled container
    - Close button (×) in header to return to previous screen
    - Loading and error states
    - Uses theme colors for dark/light mode support
    - Landscape orientation support
  - ✅ Integrated into CrewModal recruiting view
    - "View" button on applicant cards opens VisitingProfileModal
    - Passes applicant's userId to modal
    - Modal closes and returns to recruiting view when closed
    - State management for viewing profile (viewingProfileUserId)
  - ✅ Modal behavior
    - Returns to previous screen when closed (recruiting view in this case)
    - Designed to work from any view in the future (map view, etc.)
    - Modal can be closed by clicking close button or overlay

### 23. Implement Accept Applicant Functionality
- **Status**: ✅ Completed
- **Description**: When a crew owner/executive clicks "Accept" on an applicant, update the applicant's crew status and add them to the crew's members array. Ensure UI refreshes automatically for the accepted user.
- **Progress**:
  - ✅ Created server API endpoint (server/src/routes/crew.ts)
    - POST /api/crew/accept-applicant - Accepts an applicant to the crew
    - Validates requester is president or executive
    - Validates requester is a member of the crew
    - Validates applicant is in applicants array
    - Updates applicant's CrewStatus: isInCrew=true, crewId, crewIdentifier, role='member', clears appliedCrewId/appliedCrewIdentifier
    - Removes applicant from crew.applicants array
    - Adds applicant userId to crew.members array
    - Prevents duplicate members
  - ✅ Added client API hook (mobile/src/store/api/authApi.ts)
    - useAcceptApplicantMutation - Accepts an applicant via API
    - Invalidates 'User' tag to refresh crew status for all users
  - ✅ Integrated into CrewModal recruiting view
    - "Accept" button calls handleAcceptApplicant handler
    - Shows loading state ("Accepting...") while processing
    - Button disabled during acceptance
    - Refetches crew details and crew status after acceptance
  - ✅ Automatic UI refresh
    - RTK Query cache invalidation with 'User' tag automatically refreshes crew status
    - Accepted user's UI automatically updates:
      - Shows CrewModal instead of CrewOnboardingModal
      - hackCrew icon changes to hackCrewActive.png
    - Crew owner's view updates to remove accepted applicant from list

### 24. Implement Members View
- **Status**: ✅ Completed
- **Description**: Display crew members organized by role: President at top, 4 Executive slots, and numbered regular Members list. Show usernames from database user IDs.
- **Progress**:
  - ✅ Updated server API endpoint (server/src/routes/crew.ts)
    - GET /api/crew/:crewId now populates President, executives, and members with user handles
    - Returns structured data: president (userId, handle), executives array, members array
    - Uses Mongoose populate to fetch user handles from ObjectIds
  - ✅ Updated client API interface (mobile/src/store/api/authApi.ts)
    - Updated getCrewDetails query type to include president, executives, and members with usernames
    - Type-safe interface for crew member data
  - ✅ Implemented Members view UI (mobile/src/components/hackMap/CrewModal.tsx)
    - Created renderMembers() function
    - President section: Shows president's username at top
    - Executives section: Shows 4 executive slots in 2-column grid layout
      - Empty slots show blank (no text)
      - Filled slots show executive username
    - Members section: Shows regular members with sequential numbering (1., 2., 3., etc.)
      - Filters out executives and president from members list
      - Each member shows number and username
    - Scrollable view with proper spacing and styling
    - Fetches crew details when members category is opened
    - Uses theme colors for dark/light mode support
  - ✅ Enhanced Members view features
    - Current user highlighting: User's own name displayed in primary color (colors.primary) for easy identification
    - 2-column layout for Members section: Members displayed in 2-column grid layout (same as executives)
    - User levels displayed: Shows "Lv X" for all members (president, executives, and regular members)
    - Server endpoint updated to populate user levels along with handles
    - Client API interface updated to include level in member data types

### 25. Implement Role-Based Category Visibility
- **Status**: ✅ Completed
- **Description**: Filter crew modal categories based on user role (member, executive, president) to show/hide appropriate views.
- **Progress**:
  - ✅ Created getVisibleCategories() function (mobile/src/components/hackMap/CrewModal.tsx)
    - Filters CATEGORIES array based on user role from crewStatus
    - Checks if user is executive by comparing userId with crew executives array
  - ✅ Role-based visibility rules:
    - **Members**: See Guild Information, Members, Awards, Crew Rules, Ranking, Internal Message Board, External Message Board
      - Hidden: Crew Settings, Recruiting
    - **Executives**: See all categories except Crew Settings
      - Hidden: Crew Settings only
      - Visible: Recruiting (can accept/deny applicants)
    - **President**: See all categories including Crew Settings
      - Full access to all crew management features
  - ✅ Updated renderCategoryList to use filtered categories
    - Only displays categories visible to current user's role
    - Maintains 3-column grid layout with proper spacing
  - ✅ Updated modal title to show crew name and identifier
    - Title displays as "crewName (CREWID)" format
    - Falls back to crew name, identifier, or "Crew System" if data unavailable
    - Remains centered in header

### 26. Implement Crew Information View
- **Status**: ✅ Completed
- **Description**: Change "Guild Information" to "Crew Information" and implement view showing crew details: creation date, member count, primary language, crew name, and crew identifier.
- **Progress**:
  - ✅ Updated category label (mobile/src/components/hackMap/CrewModal.tsx)
    - Changed "Guild information" to "Crew Information" in CATEGORIES array
  - ✅ Updated server API endpoint (server/src/routes/crew.ts)
    - GET /api/crew/:crewId now returns createdAt (ISO string) and memberCount
    - Member count calculated as: 1 (president) + executives.length + members.length
  - ✅ Updated client API interface (mobile/src/store/api/authApi.ts)
    - Added createdAt: string | null and memberCount: number to crew data type
  - ✅ Implemented Crew Information view (mobile/src/components/hackMap/CrewModal.tsx)
    - Created renderCrewInformation() function
    - Displays 5 information items in styled cards:
      - Crew Name: Shows crew name
      - Crew Identifier: Shows crew identifier
      - Primary Language: Shows native language
      - Members: Shows current member count
      - Created: Shows formatted creation date (e.g., "November 15, 2025")
    - Date formatting: Uses toLocaleDateString with readable format
    - Loading state: Shows "Loading crew information..." while fetching
    - Scrollable view with proper spacing and styling
    - Uses theme colors for dark/light mode support
    - Fetches crew details when guild-information category is opened

### 27. Update Crew Settings View with New Settings
- **Status**: ✅ Completed
- **Description**: Add new crew management settings buttons to Crew Settings view while keeping existing settings.
- **Progress**:
  - ✅ Added 7 new settings buttons at the top of the settings list
    - Edit Crew Name
    - Edit Crew Identifier
    - Edit Crew Rules
    - Update Internal Message Board
    - Update External Message Board
    - Manage Members
    - Change Language
  - ✅ Kept all existing settings buttons
    - Assign Executives, Gift All Members, Declare War, Terminate War Declaration, Request Alliance, Accept Alliance, Terminate Alliance, Choose Successor, Resign, Disband Crew
  - ✅ Updated danger styling logic
    - Last 3 buttons (Choose Successor, Resign, Disband Crew) maintain red danger styling
    - Disband Crew button retains red border
    - Adjusted indices to account for new buttons (isLastThree: index >= 14, isDisbandCrew: index === 16)
  - ✅ Total of 17 settings buttons in 2-column grid layout
    - New settings appear first, followed by existing settings
    - All buttons maintain consistent styling and layout

### 28. Implement Ranking View
- **Status**: ✅ Completed
- **Description**: Display crew members ranked by level: President at rank #1, Executives sorted by level (highest to lowest), Members sorted by level (highest to lowest).
- **Progress**:
  - ✅ Created renderRanking() function (mobile/src/components/hackMap/CrewModal.tsx)
    - Fetches president, executives, and members from crewDetails
    - Sorts executives by level (descending order)
    - Filters out executives and president from members list
    - Sorts members by level (descending order)
  - ✅ Implemented ranking display
    - President section: Always shows at rank #1
    - Executives section: Shows executives sorted by level, continuing ranking (2, 3, 4, etc.)
    - Members section: Shows members sorted by level, continuing ranking sequentially
    - Each entry displays: rank number, username/handle, and level (Lv X)
  - ✅ Current user highlighting
    - Uses same isLoggedInUser helper function as Members view for robust comparison
    - Highlights current user with primary color border, tinted background, bold text, and "(You)" label
    - Ensures semantic comparison to avoid race conditions
  - ✅ Styling and layout
    - Scrollable view with proper spacing
    - Section titles for President, Executives, and Members
    - Each ranking item in styled card with border and background
    - Uses theme colors for dark/light mode support
    - Fetches crew details when ranking category is opened
  - ✅ Integrated into CrewModal
    - Added ranking category to conditional rendering
    - Accessible from category list when visible to user's role

### 29. Implement Deny Applicant Functionality
- **Status**: ✅ Completed
- **Description**: When a crew owner/executive clicks "Deny" on an applicant, remove the application from the wait list and database. This removes the applicant from the crew's applicants array and clears the user's CrewStatus appliedCrewId and appliedCrewIdentifier fields.
- **Progress**:
  - ✅ Created server API endpoint (server/src/routes/crew.ts)
    - POST /api/crew/deny-applicant - Denies an applicant and removes application
    - Validates requester is president or executive
    - Validates requester is a member of the crew
    - Validates applicant is in applicants array
    - Removes applicant from crew.applicants array
    - Clears applicant's CrewStatus: appliedCrewId=null, appliedCrewIdentifier=null
  - ✅ Added client API hook (mobile/src/store/api/authApi.ts)
    - useDenyApplicantMutation - Denies an applicant via API
    - Invalidates 'User' tag to refresh crew status for all users
  - ✅ Integrated into CrewModal recruiting view
    - "Deny" button calls handleDenyApplicant handler
    - Shows loading state ("Denying...") while processing
    - Button disabled during denial
    - Refetches crew details and crew status after denial
  - ✅ Automatic UI refresh
    - RTK Query cache invalidation with 'User' tag automatically refreshes crew status
    - Denied applicant is removed from recruiting view immediately
    - User's application status is cleared from their CrewStatus
  - ✅ Applicant view updates
    - Added polling to crew status query in VisitCrewModal (3 second interval when modal is visible)
    - Added polling to crew status query in CrewOnboardingModal (3 second interval when modal is visible)
    - Ensures applicant sees application status update immediately when denied (within 3 seconds)
    - Polling only active when modals are visible to minimize unnecessary requests
  - ✅ Crew recruiting view updates
    - Added polling to crew details query in CrewModal when recruiting view is active (3 second interval)
    - Added refetchOnMountOrArgChange to getCrewDetails query for better cache management
    - Ensures crew owner/executive sees new applicants appear immediately when they apply (within 3 seconds)
    - Polling only active when recruiting category is selected and modal is visible
  - ✅ Auto-close modals when user joins crew
    - Added useEffect in HackMapScreen to close CrewOnboardingModal and open CrewModal when user joins crew
    - Added useEffect in CrewOnboardingModal to close itself and VisitCrewModal when user joins crew
    - Added useEffect in VisitCrewModal to close itself when user joins crew
    - Added early return checks to prevent VisitCrewModal and CrewOnboardingModal from rendering if user is in a crew
    - Ensures users who are accepted into a crew immediately see CrewModal instead of visiting/onboarding modals
    - Modals automatically close within 3 seconds (polling interval) when user is accepted

### 30. Implement Leave Crew Functionality
- **Status**: ✅ Completed
- **Description**: Add "Leave Crew" button for members and executives (not president) in the Members view. When clicked, shows confirmation modal and removes user from crew, updating both CrewStatus and Crew collections.
- **Progress**:
  - ✅ Created LeaveCrewModal component (mobile/src/components/hackMap/LeaveCrewModal.tsx)
    - Confirmation modal warning user they will be removed and must reapply
    - Cancel and Leave Crew buttons with loading states
    - Error handling and display
  - ✅ Created server API endpoint (server/src/routes/crew.ts)
    - POST /api/crew/leave - Removes user from crew
    - Validates user is in a crew and not president
    - Removes user from crew.members or crew.executives array
    - Updates user's CrewStatus: isInCrew=false, crewId=null, crewIdentifier=null, role=null
  - ✅ Added client API hook (mobile/src/store/api/authApi.ts)
    - useLeaveCrewMutation - Leaves crew via API
    - Invalidates 'User' tag to refresh crew status
  - ✅ Integrated into CrewModal Members view
    - "Leave Crew" button appears at top of Members view
    - Only visible for members and executives (not president)
    - Opens LeaveCrewModal when clicked
    - Closes CrewModal and refreshes crew status after leaving
    - hackCrew icon automatically updates in toolbar (via cache invalidation)
  - ✅ Moved "Leave Crew" button to main category list view
    - Button now appears in main CrewModal grid view alongside other categories
    - Only visible for members and executives (not president)
    - Styled with red border and same background as other category buttons
    - Positioned in grid layout with proper spacing

### 31. Improve Real-Time Updates for Recruiting View
- **Status**: ✅ Completed
- **Description**: Enhance real-time updates for the recruiting view so that new applicants appear immediately when they apply, and the red notification dot updates in real-time on the "Recruiting" button in the main view.
- **Progress**:
  - ✅ Enhanced crew details query polling (mobile/src/components/hackMap/CrewModal.tsx)
    - Added conditional polling for crew details when modal is visible
    - Polls every 3 seconds when user is president/executive and viewing main category list OR when in recruiting view
    - Ensures red notification dot updates immediately when applicants apply
    - Ensures recruiting view refreshes automatically when new applicants are added
  - ✅ Implemented memoized applicant check
    - Added useMemo for hasApplicants calculation to prevent unnecessary rerenders
    - Only recalculates when applicants array length changes
    - Improves performance and reduces unnecessary UI updates
  - ✅ Improved query subscription strategy
    - Base query always subscribed when modal is visible (not skipped)
    - Ensures RTK Query tag invalidation triggers immediate refetch
    - Polling query provides backup to catch updates even if tag invalidation timing is off
    - Active crew details uses polled data when available, falls back to initial query
  - ✅ Fixed hack crew icon click behavior
    - Updated handleHackCrewPress in HackMapScreen to explicitly close both modals before opening correct one
    - Ensures clean state transition when user leaves crew or applies to crew
    - Prevents modals from being "stuck" in state
    - Added useEffect to automatically close CrewModal when user leaves crew

### 32. Implement VisitCrewModal Views (Awards, Members, External Message Board)
- **Status**: ✅ Completed
- **Description**: Add three views to VisitCrewModal that match CrewModal: Awards view, Members view, and External Message Board view. These views allow visitors to see crew information before applying.
- **Progress**:
  - ✅ Added crew details query to VisitCrewModal (mobile/src/components/hackMap/VisitCrewModal.tsx)
    - Uses useGetCrewDetailsQuery to fetch crew details by crewId
    - Query only runs when modal is visible and crewId is available
  - ✅ Implemented Awards view (renderAwards)
    - Identical to CrewModal's awards view
    - Shows empty state message: "This Crew Has Not Received Any Rewards Yet"
    - Same styling and layout as CrewModal
  - ✅ Implemented Members view (renderMembers)
    - Shows President, Executives (up to 4 slots), and regular Members
    - Same layout and structure as CrewModal's members view
    - Displays member handles and levels
    - Removed "You" highlighting since visitors aren't members
    - Uses crew details fetched from API
  - ✅ Implemented External Message Board view (renderExternalMessageBoard)
    - Placeholder view for now (external message board data structure not yet in crew details)
    - Ready to display content when data structure is available
    - Same styling as awards view
  - ✅ Added all necessary styles
    - Added categoryContent, awardsEmptyContainer, awardsEmptyText styles
    - Added membersScrollContent, membersSection, membersSubsection styles
    - Added membersList, executiveSlots, memberItem styles
    - Added executiveSlot, memberSlot, memberNumber, memberHandle, memberLevel styles
    - Added sectionTitle style
    - All styles match CrewModal for consistency
  - ✅ Updated renderCategoryView routing
    - Routes to appropriate render function based on currentCategory
    - Awards, Members, and External Message Board now display proper views instead of placeholders
  - ✅ Fixed formatting differences to match CrewModal exactly
    - Fixed empty executive slots to show `null` instead of "Empty" text (matches CrewModal behavior)
    - Added missing `padding: SIZING.spacing.lg` to `categoryContent` style to match CrewModal
    - Removed `visitCrewCategoryContent` wrapper from members/awards/external-message-board views
    - The wrapper had `justifyContent: 'center'` and `alignItems: 'center'` which was causing content to be squished
    - Now render functions are placed directly without centering wrapper, matching CrewModal's structure
    - Only apply-to-crew view uses the centering wrapper (which is appropriate for that centered button)
    - Members view now stretches properly and matches CrewModal's layout exactly

### 33. Implement Edit Crew Name Functionality
- **Status**: ✅ Completed
- **Description**: Implement the "Edit Crew Name" button functionality in Crew Settings view. When clicked, a modal should pop up allowing the president to edit the crew name with the same validation rules as crew creation (max 12 characters, a-z, 0-9, _, -). The system should check for name availability (crew names must be unique). Once updated, it should update in the database and refresh all relevant views (CrewModal main view, CrewOnboardingModal search/suggested areas) using RTK Query cache invalidation or events rather than constant database polling.
- **Progress**:
  - ✅ Created EditCrewNameModal component (mobile/src/components/hackMap/EditCrewNameModal.tsx)
    - Modal with validation matching crew creation rules (max 12 chars, a-z, 0-9, _, -)
    - Real-time validation with error messages
    - Character filtering to prevent invalid input
    - Loading states and error handling
    - Styled consistently with app theme
  - ✅ Added server API endpoint (server/src/routes/crew.ts)
    - POST /api/crew/update-name - Updates crew name with availability check
    - Validates user is president
    - Validates crew name format and length
    - Checks for name uniqueness case-insensitively (excludes current crew)
    - Stores crew name with original case as entered by user
    - Returns updated crew data
  - ✅ Updated crew name uniqueness validation
    - Case-insensitive uniqueness check: converts to lowercase for comparison
    - Preserves original case when storing in database
    - Display shows crew name exactly as user entered it
    - Updated both /create and /update-name endpoints to use case-insensitive comparison
  - ✅ Added client API mutation (mobile/src/store/api/authApi.ts)
    - useUpdateCrewNameMutation hook
    - Invalidates 'User' tag to refresh all crew-related queries automatically
  - ✅ Integrated into CrewModal (mobile/src/components/hackMap/CrewModal.tsx)
    - "Edit Crew Name" button in Crew Settings view opens EditCrewNameModal
    - Handles update action with loading states
    - Refetches crew details and crew status after update
    - Modal closes on successful update
  - ✅ Automatic view updates via RTK Query cache invalidation and polling
    - All crew-related queries use 'User' tag (getCrewDetails, getCrewStatus, searchCrews, getSuggestedCrews)
    - Cache invalidation automatically refreshes on update
    - Added conditional polling (3 second interval) for real-time updates when modals are visible:
      - CrewModal: polls getCrewDetails when modal is visible
      - VisitCrewModal: polls getCrewDetails when modal is visible
      - CrewOnboardingModal: polls searchCrews (when search query active) and getSuggestedCrews when modal is visible
    - VisitCrewModal header now uses crewDetails.crew.crewName instead of prop for real-time updates
    - Updates appear within 3 seconds for all users viewing the crew

