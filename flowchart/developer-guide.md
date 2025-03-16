# TDD Workflow Flowchart - Developer Guide

This guide provides technical information for developers who need to maintain or update the TDD workflow flowchart.

## File Structure

The flowchart consists of three main files:

1. `index.html` - Main HTML structure
2. `styles.css` - CSS styling for the flowchart
3. `tdd-flowchart.js` - JavaScript logic for generating and interacting with the flowchart

## Flowchart Data Structure

The flowchart is generated from data arrays defined in `tdd-flowchart.js`:

### 1. Processes Array

```javascript
const processes = [
  // Phase Headers
  { id: 'phase-init', type: 'phase', x: 400, y: 50, label: 'Initialization Phase' },
  // ...

  // Process Steps
  { id: 'step-1', type: 'process', command: 'READ', actor: 'USER', number: 1, x: 200, y: 150, label: 'Initialize TDD Workflow' },
  // ...
];
```

Each process node has:
- `id`: A unique identifier
- `type`: Either 'phase' or 'process'
- `x` and `y`: Grid coordinates
- `label`: Displayed text
- `command`: For process nodes, the command type (READ, WRITE, DECIDE, RUN)
- `actor`: For process nodes, the actor (USER, AI, FILE)
- `number`: For process nodes, the step number in sequence

### 2. Documents Array

```javascript
const documents = [
  { id: 'doc-init', type: 'document', x: 800, y: 150, label: 'TDD Initialize' },
  // ...
];
```

Each document node has:
- `id`: A unique identifier
- `type`: Always 'document'
- `x` and `y`: Grid coordinates
- `label`: Displayed text

### 3. Connections Array

```javascript
const connections = [
  { from: 'step-1', to: 'doc-init', label: 'Read', isDocumentConnection: true },
  { from: 'step-1', to: 'step-2', label: 'Next' },
  // ...
];
```

Each connection has:
- `from`: Source node ID
- `to`: Target node ID
- `label`: Displayed text for the connection
- `isDocumentConnection`: Boolean flag for document connections

### 4. Step Descriptions

```javascript
const stepDescriptions = {
  'step-1': {
    title: 'Initialize TDD Workflow',
    description: 'Start the TDD workflow process by reading the initialization file.',
    filePath: '/tdd-initialize.mdc',
    actor: 'USER initiates the process'
  },
  // ...
};
```

## Grid System

The flowchart uses a grid system for consistent positioning:

- Each column is 200px wide
- Each row is 120px high
- Grid lines are drawn to provide visual reference
- Column and row labels show grid coordinates

## Making Updates

### Adding a New Step

1. Add the step to the `processes` array:
```javascript
{ 
  id: 'step-XX', 
  type: 'process', 
  command: 'READ', 
  actor: 'USER', 
  number: XX, 
  x: 200, 
  y: 150, 
  label: 'New Step'
}
```

2. Add connections to and from the step:
```javascript
{ from: 'previous-step', to: 'step-XX', label: 'Next' }
{ from: 'step-XX', to: 'next-step', label: 'Next' }
```

3. Add a description for the step:
```javascript
'step-XX': {
  title: 'New Step',
  description: 'Detailed description of what this step does.',
  filePath: '/path/to/relevant/file.mdc',
  actor: 'Actor responsible for this step'
}
```

4. Update step numbers for subsequent steps if necessary

### Adding a New Document

1. Add the document to the `documents` array:
```javascript
{ id: 'doc-XXX', type: 'document', x: 800, y: 150, label: 'New Document' }
```

2. Add connections to and from the document:
```javascript
{ from: 'step-XX', to: 'doc-XXX', label: 'Read', isDocumentConnection: true }
```

3. Update the hidden file paths reference in `index.html`

### Modifying the Workflow Sequence

1. Update connections to reflect the new sequence:
```javascript
// Remove old connection
// { from: 'step-1', to: 'step-2', label: 'Next' },

// Add new connection
{ from: 'step-1', to: 'step-3', label: 'Next' },
```

2. Renumber steps if necessary
3. Update the step descriptions to reflect the new sequence

### Adding a New Phase

1. Add a phase header to the `processes` array:
```javascript
{ id: 'phase-new', type: 'phase', x: 400, y: 1800, label: 'New Phase' }
```

2. Position steps within the new phase

### Layout Best Practices

1. **Consistent Spacing**: Maintain standard spacing between nodes
   - Horizontal spacing: 200px between columns
   - Vertical spacing: 120px between rows

2. **Logical Flow**: Ensure the workflow flows in a logical sequence
   - Generally top-to-bottom, left-to-right
   - Follow the natural reading direction

3. **Connection Clarity**: Minimize crossing connections
   - Position nodes to reduce line crossings
   - Use clear labels on connections

4. **Document Positioning**: Position documents for optimal access
   - Place documents where they're first accessed
   - Keep related documents grouped together

5. **Phase Organization**: Clearly separate phases
   - Use phase headers to mark the beginning of each phase
   - Add sufficient spacing between phases

## Interactive Features

Several interactive features are implemented with event listeners in `tdd-flowchart.js`:

### Panning and Zooming

```javascript
flowchart.addEventListener('mousedown', startDrag);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', endDrag);
```

### Legend Toggle

```javascript
document.getElementById('toggleLegend').addEventListener('click', function() {
  const legend = document.querySelector('.legend-panel');
  // Toggle logic
});
```

### Phase Collapsing

```javascript
document.querySelectorAll('.phase-header').forEach(header => {
  header.addEventListener('click', function() {
    // Collapse/expand logic
  });
});
```

### Step Simulation

```javascript
document.getElementById('currentStepSelect').addEventListener('change', function() {
  const stepId = this.value;
  // Highlight current step logic
});
```

## Styling

The flowchart's appearance is controlled by CSS in `styles.css`. Key style components:

1. **Node Styles**:
   - `.node`: Base style for all nodes
   - `.phase-header`: Style for phase headers
   - `.process-node`: Style for process steps
   - `.document-node`: Style for document nodes

2. **Connection Styles**:
   - `.connection`: Style for connection lines
   - `.connection-label`: Style for connection labels
   - `.arrow`: Style for arrowheads

3. **Grid Styles**:
   - `.grid-line`: Style for grid lines
   - `.grid-label`: Style for grid coordinates

4. **Interactive Element Styles**:
   - `.enhanced-tooltip`: Style for enhanced tooltips
   - `.controls`: Style for control buttons and dropdowns
   - `.current-step`: Style for highlighting the current step

## Testing Flowchart Updates

After making updates:

1. Open `index.html` in a web browser
2. Test all interactive features:
   - Panning and zooming
   - Legend toggling
   - Phase collapsing
   - Step simulation
   - Tooltips
3. Verify the layout at different zoom levels
4. Check connections for clarity
5. Validate step numbering and sequence

## Troubleshooting

### Node Positioning Issues

- Check grid coordinates (`x` and `y` values)
- Ensure nodes don't overlap
- Verify that nodes align with grid lines

### Connection Issues

- Verify that connection `from` and `to` IDs match node IDs
- Check for crossing connections
- Ensure arrowheads point in the correct direction

### Numbering Problems

- Check that steps are numbered sequentially
- Update all step numbers if new steps are inserted
- Ensure step numbers in the UI match the process array

### Tooltip Problems

- Verify that all steps have corresponding entries in `stepDescriptions`
- Check tooltip content for accuracy
- Test tooltip positioning at different screen sizes 