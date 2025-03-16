# Flowchart Development Rules

<!-- 
AI DIRECTIVE: This rules file must be reviewed at the beginning of each workflow session
and updated regularly to reflect current best practices and project requirements.
The AI should consult this file when making decisions about flowchart implementation
and suggest updates when appropriate based on development progress.
-->

## CRITICAL RULE - STRICT ADHERENCE TO INSTRUCTIONS
- The AI has ZERO freedom to deviate from user instructions
- ONLY implement exactly what is explicitly requested
- Do NOT add features, enhancements, or "improvements" unless specifically directed
- Do NOT make assumptions about user intent
- Follow user instructions precisely and literally
- Any interpretation of vague instructions must be confirmed with the user first
- All implementation details must adhere strictly to user specifications

## Purpose
This file establishes guidelines for creating a comprehensive flowchart application that visualizes the TDD workflow using HTML, CSS, and JavaScript. The goal is to create a detailed yet understandable visualization of the complex workflow process.

## TDD Workflow Reference
The flowchart is designed to visualize the Test-Driven Development (TDD) workflow process. For a detailed explanation of the complete workflow, refer to:
- [TDD Workflow Process Flow](./tdd-workflow-flow.md)

This document provides the comprehensive step-by-step process that the flowchart aims to represent, from initialization through implementation and completion.

## Enhanced Visualization Requirements
- Create a comprehensive flowchart that clearly shows:
  - Who performs each action (USER, AI, FILE)
  - What type of command is being performed (READ, WRITE, DECIDE, RUN)
  - What/who directed the command (User Action, File Directive, AI Action)
  - The purpose and outcome of each action
  - The flow between different actions and decisions
- Maintain specific color scheme:
  - Green (#d8ecd0) for automated processes
  - Yellow/orange (#f9e79f) for manual actions
  - Light blue (#d6e4ff) for informational components
- Support for precise node shapes:
  - Rectangles (0px border-radius) for basic actions
  - Rounded rectangles (8px border-radius) for process blocks
  - Diamonds (45deg rotation) for decision points
- Connected nodes with directional arrows (1px thickness)
- Text labels positioned directly on connection lines that are clearly visible
- NO overlapping elements that obscure text (z-index management)
- Consistent spacing between elements (minimum 30px)

## Document Representation Rules
- Each unique document should be represented only once
- Show flows into and out of document nodes
- Clearly indicate when a document is being read from vs. written to
- Use connection labels to show directive paths between documents

## Actor and Command Representation
- Include a legend section that explains:
  - Command types (READ, WRITE, DECIDE, RUN)
  - Actors (USER, AI, FILE)
  - Directors (User Action, File Directive, AI Action)
- Use consistent notation: [ACTOR/COMMAND] for node labels
- Include box coloring in the legend (Blue, Green, Yellow)

## Technical Requirements
- Semantic HTML with appropriate ARIA attributes for accessibility
- CSS using BEM naming convention for components
- JavaScript with clear separation of data and rendering logic
- Support for creating a connected tree of activities
- Arrows pointing between elements in multiple directions
- Informational boxes with clear text and proper line spacing
- Responsive layout with minimum width requirements
- Proper handling of large complex diagram with many nodes

## Code Structure
- HTML:
  - Semantic element use (`header`, `section`, `figure`, etc.)
  - Clear component hierarchy with descriptive class names
  - Proper indentation and structure
- CSS:
  - Organized by component with logical grouping
  - Variables for colors, spacing, and other repeated values
  - Mobile-first approach with specific breakpoints
  - Comments for complex selectors or calculations
- JavaScript:
  - Clear data model separation from rendering logic
  - Descriptive function and variable names
  - Thorough commenting, especially for complex operations
  - Error handling for edge cases

## Development Approach
1. Start with semantic HTML structure and component-based CSS styling
2. Implement flowchart container with proper dimensions and positioning
3. Create node components with appropriate styling for each type
4. Develop connection logic with proper arrow rendering
5. Implement label positioning with configurable offsets
6. Add responsive behavior and ensure cross-browser compatibility
7. Optimize for performance with efficient rendering methods

## Success Criteria
- Flowchart visually represents all 30 steps in the TDD workflow
- Clear visualization of decision points and actions
- No overlapping elements that hide text
- Each document is represented once with multiple connections in/out
- Text is legible and properly positioned
- Legend clearly explains all node and connection types
- Code is maintainable, well-commented, and follows best practices

## Maintenance Guidelines
- Comments should be preserved unless the code they describe is removed
- CSS classes should follow BEM methodology (Block__Element--Modifier)
- New features should be documented in this rules file
- Color schemes should be consistent with established palette
- Variable naming should be descriptive and consistent throughout 