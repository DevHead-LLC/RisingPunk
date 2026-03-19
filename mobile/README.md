# RisingPunk Battle System

This is a [**React Native**](https://reactnative.dev) project with a Node.js/Express backend, implementing a strategic battle system where bot battalions compete to destroy the opposing army.

## Architecture

- **Client**: React Native mobile app (visualization and UI)
- **Server**: Node.js/Express backend (game logic and state management)
- **Database**: MongoDB with Mongoose schemas
- **API**: RESTful endpoints with RTK Query integration

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- React Native development environment
- MongoDB instance (local or cloud)
- iOS Simulator or Android Emulator

### Step 1: Server Setup

First, start the backend server:

```bash
cd server
npm install
npm start
```

The server will start on `http://localhost:3000` and connect to MongoDB.

### Step 2: Start the Metro Server

Start **Metro**, the JavaScript bundler for React Native:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

### Step 3: Start your Application

Let Metro Bundler run in its own terminal. Open a new terminal and run:

#### For Android
```bash
npm run android
# OR
yarn android
```

#### For iOS
```bash
npm run ios
# OR
yarn ios
```

### iOS build troubleshooting (LaunchScreen / DerivedData)

If the Xcode build fails (e.g. **Compile Storyboard file LaunchScreen.storyboard** or **Command CompileStoryboard failed**) or `npm run ios:clean:derived` fails with "Directory not empty":

1. **Quit Xcode and Simulator completely** (Cmd+Q). DerivedData cannot be removed while they hold files.
2. In the `mobile` folder run:
   ```bash
   npm run ios:clean:full
   ```
   If that still fails, run `npm run ios:clean:derived` again after ensuring Xcode and Simulator are quit.
3. Reopen Xcode and build the **mobile-dev** scheme for your simulator.

Optional: `npm run ios:clean:xcode` runs `xcodebuild clean` (no DerivedData delete) and can be used when Xcode is open.

## Battle System Overview

The battle system features:
- **3 Bot Types**: Guardian (Cavalry), Breacher (Infantry), Phreak (Ranged)
- **Network Topology**: 9 nodes with strategic connections
- **Tug-of-War Capture**: Neutral nodes can be captured by either side
- **Real-time Combat**: Server-driven battle logic with client visualization
- **Victory Conditions**: 20-second timer or complete elimination

## API Endpoints

### Battle Management
- `POST /api/battles/start` - Start new battle
- `GET /api/battles/:id/state` - Get battle state
- `GET /api/battles/:id/events` - Get battle events
- `POST /api/battles/:id/end` - End battle

### Movement (Batch 5H)
- `GET /api/battles/:id/movement` - Get movement state
- `POST /api/battles/:id/retarget/:battalionId` - Force retargeting

## Development Phases

- **Phase 5**: Server-driven architecture (COMPLETE)
- **Phase 6**: Movement visualization (PENDING)
- **Phase 7**: Targeting system (PENDING)
- **Phase 8**: Attack system (PENDING)
- **Phase 9**: Animations (PENDING)
- **Phase 10**: Integration (PENDING)

## Testing

Run tests for both client and server:

```bash
# Server tests
cd server
npm test

# Client tests
npm test
```

## Performance Monitoring

The system includes performance monitoring:
- Battle update timing (target: <50ms per 100ms interval)
- Damage calculation timing (target: <1ms per calculation)
- Database sync timing (every 1s)
- Client-side interpolation performance

## Documentation

- [Battle Intentions](./battle-intentions.md) - Core battle mechanics
- [Node Behaviors](./node-behaviors.md) - Node capture and advantages
- [Battalion Behaviors](./battalion-bot-behaviors.md) - Bot types and combat
- [Architecture Map](./battle-architecture-map.md) - System architecture
- [Migration Guide](./migration-guide.md) - Development guidelines

---

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Step 1: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the _root_ of your React Native project:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from the _root_ of your React Native project. Run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see your new app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.

## Step 3: Modifying your App

Now that you have successfully run the app, let's modify it.

1. Open `App.tsx` in your text editor of choice and edit some lines.
2. For **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Developer Menu** (<kbd>Ctrl</kbd> + <kbd>M</kbd> (on Window and Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (on macOS)) to see your changes!

   For **iOS**: Hit <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> in your iOS Simulator to reload the app and see your changes!

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [Introduction to React Native](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you can't get this to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
