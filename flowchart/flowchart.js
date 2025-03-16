// Flowchart.js - Handles the flowchart rendering and functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the flowchart
    initFlowchart();
});

// Sample flowchart data - This replicates a portion of the flowchart in the images
const flowchartData = {
    nodes: [
        {
            id: 'header',
            type: 'info',
            shape: 'rectangle',
            text: 'Detailed Automated AI Directive Flowchart',
            x: 400,
            y: 30,
            width: 400,
            height: 40
        },
        // Basic action nodes
        {
            id: 'read',
            type: 'manual',
            shape: 'rectangle',
            text: 'READ',
            x: 100,
            y: 100,
            width: 80,
            height: 40
        },
        {
            id: 'write',
            type: 'manual',
            shape: 'rectangle',
            text: 'WRITE',
            x: 100,
            y: 160,
            width: 80,
            height: 40
        },
        {
            id: 'run',
            type: 'manual',
            shape: 'rectangle',
            text: 'RUN',
            x: 100,
            y: 220,
            width: 80,
            height: 40
        },
        {
            id: 'decide',
            type: 'manual',
            shape: 'rectangle',
            text: 'DECIDE',
            x: 100,
            y: 280,
            width: 80,
            height: 40
        },
        // Main process categories
        {
            id: 'ai-behavior',
            type: 'info',
            shape: 'rounded',
            text: 'EXPECTED AI BEHAVIORS',
            x: 230,
            y: 160,
            width: 150,
            height: 80
        },
        {
            id: 'ai-workflow',
            type: 'automated',
            shape: 'rounded',
            text: 'AUTOMATED WORKFLOW',
            x: 430,
            y: 160,
            width: 150,
            height: 80
        },
        {
            id: 'manual-process',
            type: 'manual',
            shape: 'rounded',
            text: 'MANUAL PROCESS',
            x: 630,
            y: 160,
            width: 150,
            height: 80
        },
        // Workflow examples from image
        {
            id: 'action-user-provides',
            type: 'info',
            shape: 'rectangle',
            text: 'ACTION: User provides\nTDD Directive file',
            x: 400,
            y: 350,
            width: 200,
            height: 60
        },
        {
            id: 'initialize',
            type: 'automated',
            shape: 'rounded',
            text: '/Users/robertthiel/\nDevHead_LLC/RisingPunk/\ntdd-initialize.mdc',
            x: 400,
            y: 450,
            width: 200,
            height: 80
        },
        {
            id: 'first-action',
            type: 'automated',
            shape: 'rectangle',
            text: 'tdd-initialize.mdc:\nFIRST_ACTION',
            x: 200,
            y: 570,
            width: 200,
            height: 60
        },
        {
            id: 'read-instruction',
            type: 'info',
            shape: 'rounded',
            text: 'Read initialization file to understand\nTDD workflow instructions. Leads to\nnext directive action',
            x: 600,
            y: 570,
            width: 250,
            height: 80
        },
        {
            id: 'context-path',
            type: 'automated',
            shape: 'rounded',
            text: '/Users/robertthiel/\nDevHead_LLC/RisingPunk/\nrules/context/tdd/\nactive-working-context.mdc',
            x: 400,
            y: 650,
            width: 200,
            height: 100
        },
        {
            id: 'next-file',
            type: 'info',
            shape: 'rectangle',
            text: 'READ: AI Directives to understand\nworkflow structure',
            x: 600,
            y: 700,
            width: 250,
            height: 60
        }
    ],
    connections: [
        // Top connections
        { from: 'ai-behavior', to: 'read', label: 'Directed By AI Action' },
        { from: 'ai-workflow', to: 'write', label: 'Directed By File Directive' },
        { from: 'manual-process', to: 'run', label: 'Directed By User Action' },
        
        // Workflow connections
        { from: 'action-user-provides', to: 'initialize', label: '' },
        { from: 'initialize', to: 'first-action', label: 'FIRST_ACTION directive' },
        { from: 'initialize', to: 'read-instruction', label: 'Directed By User Action' },
        { from: 'read-instruction', to: 'context-path', label: '' },
        { from: 'context-path', to: 'next-file', label: 'Directed by:\nworkflow-directive.mdc:\nNEXT FILE TO READ' }
    ]
};

function initFlowchart() {
    const container = document.querySelector('.flowchart-container');
    
    // Create nodes
    flowchartData.nodes.forEach(node => {
        createNode(container, node);
    });
    
    // Create connections
    flowchartData.connections.forEach(connection => {
        createConnection(container, connection);
    });
}

function createNode(container, nodeData) {
    const node = document.createElement('div');
    node.id = nodeData.id;
    node.className = `node node-${nodeData.type} node-${nodeData.shape}`;
    node.style.left = `${nodeData.x}px`;
    node.style.top = `${nodeData.y}px`;
    node.style.width = `${nodeData.width}px`;
    node.style.height = `${nodeData.height}px`;
    
    if (nodeData.shape === 'diamond') {
        const span = document.createElement('span');
        span.textContent = nodeData.text;
        node.appendChild(span);
    } else {
        // Handle multi-line text
        const textLines = nodeData.text.split('\n');
        if (textLines.length > 1) {
            textLines.forEach((line, index) => {
                const textEl = document.createElement('div');
                textEl.textContent = line;
                if (index > 0) {
                    textEl.style.marginTop = '4px';
                }
                node.appendChild(textEl);
            });
        } else {
            node.textContent = nodeData.text;
        }
    }
    
    container.appendChild(node);
}

function createConnection(container, connectionData) {
    const fromNode = document.getElementById(connectionData.from);
    const toNode = document.getElementById(connectionData.to);
    
    if (!fromNode || !toNode) return;
    
    // Get positions
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate from and to coordinates relative to container
    const fromX = fromRect.left + fromRect.width / 2 - containerRect.left + container.scrollLeft;
    const fromY = fromRect.top + fromRect.height / 2 - containerRect.top + container.scrollTop;
    const toX = toRect.left + toRect.width / 2 - containerRect.left + container.scrollLeft;
    const toY = toRect.top + toRect.height / 2 - containerRect.top + container.scrollTop;
    
    // Calculate arrow length and angle
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Create arrow
    const arrow = document.createElement('div');
    arrow.className = 'arrow';
    arrow.style.width = `${length}px`;
    arrow.style.left = `${fromX}px`;
    arrow.style.top = `${fromY}px`;
    arrow.style.transform = `rotate(${angle}deg)`;
    arrow.style.transformOrigin = '0 0';
    
    // Add label if provided
    if (connectionData.label) {
        const label = document.createElement('div');
        label.className = 'connection-label';
        
        // Handle multi-line labels
        const labelLines = connectionData.label.split('\n');
        if (labelLines.length > 1) {
            labelLines.forEach((line, index) => {
                const lineEl = document.createElement('div');
                lineEl.textContent = line;
                if (index > 0) {
                    lineEl.style.marginTop = '2px';
                }
                label.appendChild(lineEl);
            });
        } else {
            label.textContent = connectionData.label;
        }
        
        label.style.position = 'absolute';
        label.style.left = `${fromX + dx / 2}px`;
        label.style.top = `${fromY + dy / 2 - 20}px`;
        label.style.transform = 'translate(-50%, -50%)';
        container.appendChild(label);
    }
    
    container.appendChild(arrow);
} 