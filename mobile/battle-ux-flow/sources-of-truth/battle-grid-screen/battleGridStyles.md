# battleGridStyles Utility - Source of Truth

## File Description
The `battleGridStyles` utility provides all visual styling and responsive layout definitions for the BattleGridScreen component. It serves as the centralized styling source of truth, ensuring consistent visual appearance and responsive behavior across the battle interface. This utility encapsulates all styling concerns, making the BattleGridScreen component cleaner and more focused on orchestration.

## Imported Logic
- **React Native** - `StyleSheet`, `Dimensions` for styling and responsive design
- **Screen dimensions** - Dynamic width and height calculations for responsive layout

## Internal Logic
- **Container styling** - Main screen container with black background and full flex layout
- **Battle area layout** - Centered battle visualization area with flex positioning
- **Network container** - Absolute positioned network visualization container
- **Loading states** - Loading container, text, and activity indicator styling
- **Error states** - Error text and subtext styling for failed data loading
- **Information containers** - Bot info, battalion stats, and battalion info containers
- **Text styling** - Title, subtitle, and various text element styling
- **Responsive design** - Screen dimension-based layout calculations

## Key Style Categories
- **Layout containers** - Main screen structure and positioning
- **Loading/error states** - User feedback styling for data states
- **Information displays** - Bot and battalion information containers
- **Text elements** - Typography and text styling hierarchy
- **Color scheme** - Consistent color palette for battle interface

## Responsive Design
- **Screen dimensions** - Dynamic width and height calculations
- **Flexible layouts** - Responsive container sizing and positioning
- **Scalable elements** - Proportionally sized UI elements

## Color Palette
- **Background** - Black (#000000) for immersive battle experience
- **Primary** - Purple (#4717F6) for loading states and bot info
- **Warning** - Yellow (#FFC107) for battalion stats
- **Error** - Red (#FF4141) for error states and battalion info
- **Text** - White (#FFFFFF) for primary text, gray (#666666) for secondary 