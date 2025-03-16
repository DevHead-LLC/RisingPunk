# TDD Workflow Flowchart - User Guide

## Getting Started

1. Open `flowchart/index.html` in your web browser
2. You'll see a visual representation of the complete Test-Driven Development workflow

## Navigation

The flowchart provides several navigation tools to help you view and understand the workflow:

- **Panning**: Click and drag anywhere on the flowchart to move around
- **Zooming**: Use the zoom buttons or your mouse wheel to zoom in and out
- **Reset View**: Return to the default view
- **Center View**: Center the flowchart in your viewport
- **Jump to Phase**: Use the dropdown menu to quickly navigate to a specific phase

## Interactive Features

### Legend Panel

- Toggle the legend visibility using the "Show/Hide Legend" button
- The legend explains:
  - Command types (READ, WRITE, DECIDE, RUN)
  - Process types (PHASE, STEP)
  - Actors (USER, AI, FILE)
  - Directors (indicating which actor is responsible)
  - Status indicators (TODO, IN-PROGRESS, DONE)

### Phase Collapsing

- Click on phase headers to collapse/expand individual phases
- Use the "Expand/Collapse All" button to toggle all phases at once

### Current Step Simulation

- Use the "Current Step" dropdown to highlight a specific step in the workflow
- The current step will be highlighted and centered in your view
- This helps you understand where you are in the workflow process

### Enhanced Tooltips

- Hover over any step to see:
  - Step title
  - Detailed description
  - File paths involved
  - Actor responsibilities
- Hover over document nodes to see full file paths

## Understanding the Workflow

The TDD workflow consists of four main phases:

1. **Initialization Phase (Steps 1-10)**
   - Starting the workflow
   - Reading the directive tree
   - Checking and updating context
   - Selecting a feature to implement

2. **Test Creation Phase (Steps 11-18)**
   - Determining the test file path
   - Creating or updating test files
   - Running tests to confirm they fail
   - Validating test expectations

3. **Implementation Phase (Steps 19-26)**
   - Determining the implementation file path
   - Creating or updating implementation files
   - Running tests to confirm they pass
   - Refactoring as needed

4. **Completion Phase (Steps 27-30)**
   - Updating the context with completion status
   - Checking for additional features
   - Transitioning to the next feature or ending the workflow

## Key Documents

The workflow interacts with several key documents:

- **TDD Initialize** (`/tdd-initialize.mdc`): The entry point for the workflow
- **Workflow Directive** (`/workflow-reference.mdc`): Central workflow documentation
- **AI Directive Tree** (`/rules/ai-directives/tdd-workflow.mdc`): Detailed step instructions
- **Working Context** (`/rules/context/tdd/active-working-context.mdc`): Tracks current progress
- **Feature Registry** (`/rules/gameplay/intended-features/`): Contains all features to implement

## Status Tracking

Each step in the workflow can have one of three status indicators:

- **TODO**: Steps that have not been started yet
- **IN-PROGRESS**: The current step being worked on
- **DONE**: Steps that have been completed

## Following the Workflow Process

1. Start at Step 1: Initialize TDD Workflow
2. Follow the numbered steps sequentially
3. Use the document nodes for reference as you progress through the workflow
4. Pay attention to the actors (USER, AI, FILE) responsible for each step
5. Update the status of steps as you complete them

The flowchart is designed to guide you through the complete TDD process from start to finish, ensuring that all steps are followed in the correct order. 