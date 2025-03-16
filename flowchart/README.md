# TDD Workflow Flowchart

This directory contains a visual representation of the Test-Driven Development (TDD) workflow process. The flowchart follows the complete TDD workflow from initialization through test creation, implementation, and completion phases.

## Overview

The flowchart is built using HTML, CSS, and JavaScript to create an interactive visualization that shows:

- Sequential steps (numbered 1-30) following the workflow process
- Clear categorization of command types (READ, WRITE, DECIDE, RUN)
- Actor information for each step (USER, AI, FILE)
- Documents referenced throughout the workflow
- Connections between steps with labeled actions

## Grid-Based Layout

The flowchart uses a grid-based layout for consistent positioning and clear visualization:

- **Horizontal spacing**: Each column is 200px wide
- **Vertical spacing**: Each row is 120px high
- **Document nodes**: Located at consistent positions for easy reference
- **Phase headers**: Mark the beginning of each workflow phase
- **Grid lines**: Provide visual reference points for alignment

## Key Files

1. **index.html**: The main HTML file for viewing the flowchart
2. **styles.css**: Contains all styling for the flowchart components
3. **tdd-flowchart.js**: JavaScript code that generates the flowchart with all nodes and connections
4. **tdd-workflow-flow.md**: Reference document describing the complete workflow process
5. **tdd-initialize.mdc**: Entry point reference for the TDD workflow

## How to Use

1. Open `index.html` in a web browser to view the flowchart
2. Use mouse drag to pan around the flowchart
3. Use zoom controls in the bottom right to zoom in/out
4. Click the "Show Legend" button in the top right to see the legend
5. Use the "Jump to" dropdown to navigate directly to a specific phase

## Navigation

- **Panning**: Click and drag to move around the flowchart
- **Zooming**: Use the zoom buttons or mouse wheel to zoom in/out
- **Resetting view**: Click "Reset View" to return to the default view
- **Centering view**: Click "Center View" to center on the workflow
- **Phase selection**: Use the dropdown to jump to specific phases

## Grid Coordinates

The flowchart displays grid coordinates to help with positioning and referencing specific nodes:

- **X-coordinates**: Horizontal position (200px per column)
- **Y-coordinates**: Vertical position (100px major gridlines)
- **Phase positions**:
  - Initialization Phase: y=50
  - Test Creation Phase: y=550
  - Implementation Phase: y=1050
  - Completion Phase: y=1550

## Understanding the Workflow

Follow the numbered steps (1-30) to understand the complete workflow process:

1. **Initialization Phase (steps 1-10)**: Setting up the TDD environment and selecting a feature
2. **Test Creation Phase (steps 11-18)**: Creating and validating test files
3. **Implementation Phase (steps 19-26)**: Implementing and refactoring code to pass tests
4. **Completion Phase (steps 27-30)**: Updating context and transitioning to the next feature

## Technical Notes

- The flowchart is generated dynamically using JavaScript
- Each node is positioned absolutely on the grid
- Connections are drawn dynamically based on node positions
- The grid system provides visual reference points for maintainability

## Reference Documents

For a complete understanding of the TDD workflow process, refer to:

- `/flowchart/tdd-workflow-flow.md`: Detailed explanation of all workflow steps
- `/tdd-initialize.mdc`: Entry point document for the TDD workflow process

## Maintenance

When updating the flowchart:

1. Use the grid coordinates as reference points
2. Maintain consistent spacing between nodes (minimum 30px)
3. Keep document nodes positioned for optimal access
4. Ensure all connections are clearly labeled
5. Preserve the sequential numbering of steps 