/**
 * Flowchart.js - Handles the flowchart rendering and functionality
 * 
 * This script manages the rendering of a flowchart based on a data structure that defines
 * nodes and connections. It follows a separation of data model and rendering logic.
 * 
 * The flowchart represents AI directive workflows with different node types:
 * - Automated processes (green)
 * - Manual actions (yellow)
 * - Informational components (blue)
 */

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the flowchart
    initFlowchart();
});

/**
 * Flowchart data model - Defines all nodes and connections
 * This could be loaded from a JSON file in the future for better separation
 */
const flowchartData = {
    // Array of node objects, each with positioning, styling and content information
    nodes: [
        {
            id: 'header',
            type: 'info',
            shape: 'rectangle',
            text: 'Detailed Automated AI Directive Flowchart',
            x: 500,
            y: 50,
            width: 400,
            height: 40
        },
        // Basic action nodes - The core actions available in the workflow
        {
            id: 'read',
            type: 'manual',
            shape: 'rectangle',
            text: 'READ',
            x: 230,
            y: 170,
            width: 80,
            height: 40
        },
        {
            id: 'write',
            type: 'manual',
            shape: 'rectangle',
            text: 'WRITE',
            x: 230,
            y: 230,
            width: 80,
            height: 40
        },
        {
            id: 'run',
            type: 'manual',
            shape: 'rectangle',
            text: 'RUN',
            x: 230,
            y: 290,
            width: 80,
            height: 40
        },
        {
            id: 'decide',
            type: 'manual',
            shape: 'rectangle',
            text: 'DECIDE',
            x: 230,
            y: 350,
            width: 80,
            height: 40
        },
        // Main process categories - The types of workflow components
        {
            id: 'ai-behavior',
            type: 'info',
            shape: 'rounded',
            text: 'EXPECTED AI\nBEHAVIORS',
            x: 430,
            y: 230,
            width: 150,
            height: 80
        },
        {
            id: 'ai-workflow',
            type: 'automated',
            shape: 'rounded',
            text: 'AUTOMATED\nWORKFLOW',
            x: 630,
            y: 230,
            width: 150,
            height: 80
        },
        {
            id: 'manual-process',
            type: 'manual',
            shape: 'rounded',
            text: 'MANUAL\nPROCESS',
            x: 830,
            y: 230,
            width: 150,
            height: 80
        },
        // Workflow examples from image - Specific examples of the workflow in action
        {
            id: 'action-user-provides',
            type: 'info',
            shape: 'rectangle',
            text: 'ACTION: User provides\nTDD Directive file',
            x: 500,
            y: 450,
            width: 200,
            height: 60
        },
        {
            id: 'initialize',
            type: 'automated',
            shape: 'rounded',
            text: '/Users/robertthiel/\nDevHead_LLC/RisingPunk/\ntdd-initialize.mdc',
            x: 500,
            y: 550,
            width: 200,
            height: 80
        },
        {
            id: 'first-action',
            type: 'automated',
            shape: 'rectangle',
            text: 'tdd-initialize.mdc:\nFIRST_ACTION',
            x: 300,
            y: 650,
            width: 200,
            height: 60
        },
        {
            id: 'read-instruction',
            type: 'info',
            shape: 'rounded',
            text: 'Read initialization file to understand\nTDD workflow instructions. Leads to\nnext directive action',
            x: 700,
            y: 650,
            width: 250,
            height: 80
        },
        {
            id: 'context-path',
            type: 'automated',
            shape: 'rounded',
            text: '/Users/robertthiel/\nDevHead_LLC/RisingPunk/\nrules/context/tdd/\nactive-working-context.mdc',
            x: 500,
            y: 750,
            width: 200,
            height: 100
        },
        {
            id: 'next-file',
            type: 'info',
            shape: 'rectangle',
            text: 'READ: AI Directives to understand\nworkflow structure',
            x: 700,
            y: 850,
            width: 250,
            height: 60
        }
    ],
    // Array of connection objects defining how nodes are linked together
    connections: [
        // Top section connections - EXACT match to reference image
        { 
            from: 'ai-behavior', 
            to: 'read', 
            label: 'Directed By AI Action',
            labelPosition: 'top'
        },
        { 
            from: 'ai-behavior', 
            to: 'ai-workflow', 
            label: 'Directed By File Directive',
            labelPosition: 'top'
        },
        { 
            from: 'ai-behavior', 
            to: 'manual-process', 
            label: 'Directed By User Action', 
            labelPosition: 'top'
        },
        { from: 'ai-behavior', to: 'write', label: '' },
        { from: 'ai-behavior', to: 'run', label: '' },
        
        // Workflow connections - Bottom section
        { from: 'action-user-provides', to: 'initialize', label: '' },
        { 
            from: 'initialize', 
            to: 'first-action', 
            label: 'FIRST_ACTION directive',
            labelPosition: 'top'
        },
        { 
            from: 'initialize', 
            to: 'read-instruction', 
            label: 'Directed By User Action',
            labelPosition: 'right'
        },
        { from: 'read-instruction', to: 'context-path', label: '' },
        { 
            from: 'context-path', 
            to: 'next-file', 
            label: 'Directed by:\nworkflow-directive.mdc:\nNEXT FILE TO READ',
            labelPosition: 'right'
        }
    ]
};

/**
 * Initializes the flowchart by creating all nodes and connections
 * This is the main entry point for flowchart rendering
 */
function initFlowchart() {
    const container = document.querySelector('.flowchart-container');
    
    // Ensure container is found before proceeding
    if (!container) {
        console.error('Flowchart container not found in the document');
        return;
    }
    
    // Create nodes first so they're available when creating connections
    flowchartData.nodes.forEach(node => {
        createNode(container, node);
    });
    
    // Create connections between nodes
    flowchartData.connections.forEach(connection => {
        createConnection(container, connection);
    });
}

/**
 * Creates a single node element and adds it to the container
 * 
 * @param {HTMLElement} container - The container element for the flowchart
 * @param {Object} nodeData - The data for the node to create
 * @param {string} nodeData.id - Unique identifier for the node
 * @param {string} nodeData.type - Type of node (automated, manual, info)
 * @param {string} nodeData.shape - Shape of node (rectangle, rounded, diamond)
 * @param {string} nodeData.text - Text content of the node
 * @param {number} nodeData.x - X position of the node
 * @param {number} nodeData.y - Y position of the node
 * @param {number} nodeData.width - Width of the node
 * @param {number} nodeData.height - Height of the node
 */
function createNode(container, nodeData) {
    const node = document.createElement('div');
    
    // Set node properties and positioning
    node.id = nodeData.id;
    node.className = `node node-${nodeData.type} node-${nodeData.shape}`;
    node.style.left = `${nodeData.x - nodeData.width/2}px`; // Center horizontally based on width
    node.style.top = `${nodeData.y}px`;
    node.style.width = `${nodeData.width}px`;
    node.style.height = `${nodeData.height}px`;
    
    // Handle special case for diamond shapes
    if (nodeData.shape === 'diamond') {
        const span = document.createElement('span');
        span.textContent = nodeData.text;
        node.appendChild(span);
    } else {
        // Handle multi-line text
        const textLines = nodeData.text.split('\n');
        if (textLines.length > 1) {
            // Create separate elements for each line of text
            textLines.forEach((line, index) => {
                const textEl = document.createElement('div');
                textEl.textContent = line;
                if (index > 0) {
                    textEl.style.marginTop = '4px';
                }
                node.appendChild(textEl);
            });
        } else {
            // Simple single-line text
            node.textContent = nodeData.text;
        }
    }
    
    // Add node to the container
    container.appendChild(node);
}

/**
 * Creates a connection (arrow) between two nodes
 * 
 * @param {HTMLElement} container - The container element for the flowchart
 * @param {Object} connectionData - The data for the connection to create
 * @param {string} connectionData.from - ID of the source node
 * @param {string} connectionData.to - ID of the target node
 * @param {string} connectionData.label - Optional label for the connection
 * @param {string} connectionData.labelPosition - Position of the label (right, left, top, bottom)
 */
function createConnection(container, connectionData) {
    // Get the source and target nodes
    const fromNode = document.getElementById(connectionData.from);
    const toNode = document.getElementById(connectionData.to);
    
    // Validate both nodes exist before proceeding
    if (!fromNode || !toNode) {
        console.warn(`Connection failed: Node not found for connection from "${connectionData.from}" to "${connectionData.to}"`);
        return;
    }
    
    // Get positions for calculations
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate from and to coordinates relative to container
    // Account for scrolling to ensure proper positioning
    const fromX = fromRect.left + fromRect.width / 2 - containerRect.left + container.scrollLeft;
    const fromY = fromRect.top + fromRect.height / 2 - containerRect.top + container.scrollTop;
    const toX = toRect.left + toRect.width / 2 - containerRect.left + container.scrollLeft;
    const toY = toRect.top + toRect.height / 2 - containerRect.top + container.scrollTop;
    
    // Calculate arrow dimensions and angle
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Add padding to start and end of arrow so it doesn't overlap with nodes
    const paddingStart = 10;
    const paddingEnd = 15;
    const adjustedLength = length - paddingStart - paddingEnd;
    
    // Skip connections that would be too short
    if (adjustedLength <= 0) {
        console.warn(`Connection too short: from "${connectionData.from}" to "${connectionData.to}"`);
        return;
    }
    
    // Create the arrow element
    const arrow = document.createElement('div');
    arrow.className = 'arrow';
    arrow.style.width = `${adjustedLength}px`;
    
    // Position the arrow with the correct offset and rotation
    arrow.style.left = `${fromX + (paddingStart * Math.cos(angle * Math.PI / 180))}px`;
    arrow.style.top = `${fromY + (paddingStart * Math.sin(angle * Math.PI / 180))}px`;
    arrow.style.transform = `rotate(${angle}deg)`;
    arrow.style.transformOrigin = '0 0';
    
    // Add label if provided
    if (connectionData.label) {
        const label = document.createElement('div');
        label.className = 'connection-label';
        
        // Handle multi-line labels
        const labelLines = connectionData.label.split('\n');
        if (labelLines.length > 1) {
            // Create separate elements for each line of text
            labelLines.forEach((line, index) => {
                const lineEl = document.createElement('div');
                lineEl.textContent = line;
                if (index > 0) {
                    lineEl.style.marginTop = '2px';
                }
                label.appendChild(lineEl);
            });
        } else {
            // Simple single-line label
            label.textContent = connectionData.label;
        }
        
        // Position label directly on the arrow
        const midX = fromX + dx / 2;
        const midY = fromY + dy / 2;
        
        // Apply different positioning based on the specified label position
        let offsetX = 0;
        let offsetY = 0;
        
        if (connectionData.labelPosition) {
            const labelOffset = 20; // Increased offset to prevent overlapping
            
            // Apply offsets based on desired position
            switch(connectionData.labelPosition) {
                case 'right':
                    // Position to the right of the line
                    offsetX = labelOffset * Math.sin(angle * Math.PI / 180);
                    offsetY = -labelOffset * Math.cos(angle * Math.PI / 180);
                    break;
                case 'left':
                    // Position to the left of the line
                    offsetX = -labelOffset * Math.sin(angle * Math.PI / 180);
                    offsetY = labelOffset * Math.cos(angle * Math.PI / 180);
                    break;
                case 'top':
                    // Position above the line
                    offsetY = -labelOffset;
                    break;
                case 'bottom':
                    // Position below the line
                    offsetY = labelOffset;
                    break;
            }
        }
        
        // Set final label position and styling
        label.style.position = 'absolute';
        label.style.left = `${midX + offsetX}px`;
        label.style.top = `${midY + offsetY}px`;
        label.style.transform = 'translate(-50%, -50%)';
        
        // Add white background to make text more readable
        label.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        
        // Add label to container
        container.appendChild(label);
    }
    
    // Add arrow to container
    container.appendChild(arrow);
} 