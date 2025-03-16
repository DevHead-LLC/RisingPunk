/**
 * TDD Workflow Flowchart Generator
 * 
 * This script generates a visual representation of the Test-Driven Development workflow
 * with clearly numbered sequential steps, showing the connections between different
 * phases of the process. It displays:
 * - Command types (READ, WRITE, DECIDE, RUN)
 * - Actor information (USER, AI, FILE)
 * - Clear connections between workflow steps
 * 
 * References:
 * - /flowchart/tdd-workflow-flow.md: Detailed workflow process
 * - /tdd-initialize.mdc: Initialization entry point
 */

document.addEventListener('DOMContentLoaded', function() {
    // Viewport and zoom state
    let scale = 0.7; // Start with slightly zoomed out view for better overview
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    
    // References to DOM elements
    const flowchart = document.getElementById('flowchart');
    const tooltip = document.getElementById('tooltip');
    const legendPanel = document.getElementById('legendPanel');
    const toggleLegendBtn = document.getElementById('toggleLegend');
    
    // Initialize the flowchart
    initFlowchart();
    
    // Center the view initially and apply the zoom
    setTimeout(centerView, 100); // Slight delay to ensure all elements are rendered
    
    // Keep legend hidden by default
    toggleLegendBtn.textContent = 'Show Legend';
    
    // Toggle legend panel
    toggleLegendBtn.addEventListener('click', function() {
        legendPanel.classList.toggle('active');
        this.textContent = legendPanel.classList.contains('active') ? 'Hide Legend' : 'Show Legend';
    });
    
    // Event listeners for panning
    flowchart.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Control buttons event listeners
    document.getElementById('resetViewBtn').addEventListener('click', resetView);
    document.getElementById('centerViewBtn').addEventListener('click', centerView);
    document.getElementById('zoomInBtn').addEventListener('click', function() { zoom(1.2); });
    document.getElementById('zoomOutBtn').addEventListener('click', function() { zoom(0.8); });
    
    // Phase selection event listener
    document.getElementById('phaseSelect').addEventListener('change', function() {
        const phase = this.value;
        if (!phase) return;
        
        const phaseElement = document.querySelector(`[data-phase="${phase}"]`);
        if (phaseElement) {
            const rect = phaseElement.getBoundingClientRect();
            const containerRect = flowchart.getBoundingClientRect();
            
            // Center the phase in view
            panX = (containerRect.width / 2) - (rect.left - containerRect.left + rect.width / 2) * scale;
            panY = (containerRect.height / 2) - (rect.top - containerRect.top + rect.height / 2) * scale;
            
            updateTransform();
        }
        
        // Reset the select to the placeholder
        this.value = '';
    });
    
    function startDrag(e) {
        if (e.target.closest('.control-btn, .phase-select')) return;
        
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        flowchart.classList.add('grabbing');
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
    }
    
    function endDrag() {
        isDragging = false;
        flowchart.classList.remove('grabbing');
    }
    
    function zoom(factor) {
        const prevScale = scale;
        scale *= factor;
        
        // Limit scale to reasonable bounds
        scale = Math.min(Math.max(0.1, scale), 2);
        
        // Adjust pan to zoom toward center of viewport
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        
        panX = panX * (scale / prevScale) + (viewportWidth / 2) * (1 - scale / prevScale);
        panY = panY * (scale / prevScale) + (viewportHeight / 2) * (1 - scale / prevScale);
        
        updateTransform();
    }
    
    function resetView() {
        scale = 0.7; // Default zoom level
        panX = 0;
        panY = 0;
        updateTransform();
        
        // Center after resetting
        setTimeout(centerView, 50);
    }
    
    function centerView() {
        // Get the center of the flowchart's bounding box
        const nodes = document.querySelectorAll('.node');
        if (nodes.length === 0) return;
        
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        nodes.forEach(node => {
            const rect = node.getBoundingClientRect();
            minX = Math.min(minX, rect.left);
            maxX = Math.max(maxX, rect.right);
            minY = Math.min(minY, rect.top);
            maxY = Math.max(maxY, rect.bottom);
        });
        
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight - 60; // Account for header
        
        const flowchartCenterX = (minX + maxX) / 2;
        const flowchartCenterY = (minY + maxY) / 2;
        
        const flowchartRect = flowchart.getBoundingClientRect();
        
        panX = (viewportWidth / 2) - (flowchartCenterX - flowchartRect.left);
        panY = (viewportHeight / 2) - (flowchartCenterY - flowchartRect.top);
        
        // Adjust to show more of the beginning of the workflow
        panX += 150; // Shift view slightly right to center on early phases
        panY -= 100; // Shift view slightly up
        
        updateTransform();
    }
    
    function updateTransform() {
        flowchart.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }
    
    // Tooltip for document nodes
    document.addEventListener('mouseover', function(e) {
        const target = e.target.closest('.document-node');
        if (target && target.dataset.path) {
            tooltip.textContent = target.dataset.path;
            tooltip.style.opacity = '1';
            
            const updatePosition = function(e) {
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            };
            
            updatePosition(e);
            
            const moveHandler = function(e) {
                updatePosition(e);
            };
            
            const leaveHandler = function() {
                tooltip.style.opacity = '0';
                document.removeEventListener('mousemove', moveHandler);
                target.removeEventListener('mouseleave', leaveHandler);
            };
            
            document.addEventListener('mousemove', moveHandler);
            target.addEventListener('mouseleave', leaveHandler);
        }
    });
    
    // Create grid lines for visual reference (helpful for development)
    function createGridSystem() {
        // Create horizontal grid lines
        for (let y = 0; y < 3000; y += 100) {
            const gridLine = document.createElement('div');
            gridLine.className = 'grid-line horizontal';
            gridLine.style.top = y + 'px';
            gridLine.style.left = '0';
            gridLine.style.width = '5000px';
            gridLine.style.height = '1px';
            flowchart.appendChild(gridLine);
            
            // Add y-coordinate label
            const gridLabel = document.createElement('div');
            gridLabel.className = 'grid-label';
            gridLabel.textContent = y;
            gridLabel.style.top = y + 'px';
            gridLabel.style.left = '5px';
            flowchart.appendChild(gridLabel);
        }
        
        // Create vertical grid lines
        for (let x = 0; x < 5000; x += 200) {
            const gridLine = document.createElement('div');
            gridLine.className = 'grid-line vertical';
            gridLine.style.left = x + 'px';
            gridLine.style.top = '0';
            gridLine.style.height = '3000px';
            gridLine.style.width = '1px';
            flowchart.appendChild(gridLine);
            
            // Add x-coordinate label
            const gridLabel = document.createElement('div');
            gridLabel.className = 'grid-label';
            gridLabel.textContent = x;
            gridLabel.style.left = x + 'px';
            gridLabel.style.top = '5px';
            flowchart.appendChild(gridLabel);
        }
    }
    
    function initFlowchart() {
        // Grid configuration - increase spacing for better visibility
        const colWidth = 240;  // Increased width of each column
        const rowHeight = 180; // Increased height of each row
        const headerRow = 100;  // Height for phase headers
        const documentY = 220; // Y position for document nodes
        
        // Define the flowchart data structure with grid-based layout
        const flowchartData = {
            // Phase separators
            phases: [
                { id: 'phase-init', x: 50, y: 50, text: 'Initialization Phase', dataPhase: 'initialization' },
                { id: 'phase-test', x: 50, y: 750, text: 'Test Creation Phase', dataPhase: 'test-creation' },
                { id: 'phase-impl', x: 50, y: 1350, text: 'Implementation Phase', dataPhase: 'implementation' },
                { id: 'phase-compl', x: 50, y: 1950, text: 'Completion Phase', dataPhase: 'completion' }
            ],
            
            // Document nodes (each document appears only once, positioned for best access)
            documents: [
                { id: 'doc-tdd-init', x: colWidth*2, y: documentY, text: 'TDD Initialize', path: '/tdd-initialize.mdc', type: 'document-node' },
                { id: 'doc-workflow', x: colWidth*4, y: documentY, text: 'TDD Workflow', path: '/rules/ai-directives/tdd-workflow.mdc', type: 'document-node' },
                { id: 'doc-active-context', x: colWidth*6, y: documentY, text: 'Active Context', path: '/rules/context/tdd/active-working-context.mdc', type: 'document-node' },
                { id: 'doc-feature-registry', x: colWidth*8, y: documentY, text: 'Feature Registry', path: '/rules/gameplay/intended-features/', type: 'document-node' },
                { id: 'doc-test-file', x: colWidth*2, y: 850, text: 'Feature Test File', path: '/server/tdd/tests/{feature}.test.ts', type: 'document-node' },
                { id: 'doc-impl-file', x: colWidth*4, y: 1450, text: 'Feature Implementation', path: '/server/src/features/{feature}.ts', type: 'document-node' }
            ],
            
            // Process nodes (command steps in sequential order) using grid layout with more space
            // Each row represents a logical group of steps
            processes: [
                // Initialization Phase - Row 1
                { id: 'step-1', x: colWidth*1, y: headerRow + rowHeight*1, text: 'Initialize TDD Workflow', actor: 'user', type: 'node-manual', command: 'RUN', step: 1 },
                { id: 'step-2', x: colWidth*3, y: headerRow + rowHeight*1, text: 'Read TDD Initialize', actor: 'ai', type: 'node-automated', command: 'READ', step: 2 },
                { id: 'step-3', x: colWidth*5, y: headerRow + rowHeight*1, text: 'Read TDD Workflow', actor: 'ai', type: 'node-automated', command: 'READ', step: 3 },
                { id: 'step-4', x: colWidth*7, y: headerRow + rowHeight*1, text: 'Read Active Context', actor: 'ai', type: 'node-automated', command: 'READ', step: 4 },
                
                // Initialization Phase - Row 2
                { id: 'step-5', x: colWidth*1, y: headerRow + rowHeight*2, text: 'Determine Current Status', actor: 'ai', type: 'node-automated', command: 'DECIDE', step: 5 },
                { id: 'step-6', x: colWidth*3, y: headerRow + rowHeight*2, text: 'Identify Next Action', actor: 'ai', type: 'node-automated', command: 'DECIDE', step: 6 },
                { id: 'step-7', x: colWidth*5, y: headerRow + rowHeight*2, text: 'Browse Feature Registry', actor: 'ai', type: 'node-automated', command: 'READ', step: 7 },
                { id: 'step-8', x: colWidth*7, y: headerRow + rowHeight*2, text: 'Select Feature to Implement', actor: 'ai', type: 'node-automated', command: 'DECIDE', step: 8 },
                
                // Initialization Phase - Row 3
                { id: 'step-9', x: colWidth*3, y: headerRow + rowHeight*3, text: 'Update Active Context', actor: 'ai', type: 'node-automated', command: 'WRITE', step: 9 },
                { id: 'step-10', x: colWidth*5, y: headerRow + rowHeight*3, text: 'Mark Feature as In-Progress', actor: 'ai', type: 'node-automated', command: 'WRITE', step: 10 },
                
                // Test Creation Phase - Row 1
                { id: 'step-11', x: colWidth*1, y: 750 + rowHeight*1, text: 'Create Test Structure', actor: 'ai', type: 'node-automated', command: 'DECIDE', step: 11 },
                { id: 'step-12', x: colWidth*3, y: 750 + rowHeight*1, text: 'Write Feature Test', actor: 'ai', type: 'node-automated', command: 'WRITE', step: 12 },
                { id: 'step-13', x: colWidth*5, y: 750 + rowHeight*1, text: 'Run Tests', actor: 'ai', type: 'node-automated', command: 'RUN', step: 13 },
                { id: 'step-14', x: colWidth*7, y: 750 + rowHeight*1, text: 'Verify Tests Fail', actor: 'ai', type: 'node-automated', command: 'DECIDE', step: 14 },
                
                // Test Creation Phase - Row 2
                { id: 'step-15', x: colWidth*1, y: 750 + rowHeight*2, text: 'Review Test Failures', actor: 'user', type: 'node-manual', command: 'DECIDE', step: 15 },
                { id: 'step-16', x: colWidth*3, y: 750 + rowHeight*2, text: 'Approve Test Structure', actor: 'user', type: 'node-manual', command: 'DECIDE', step: 16 },
                { id: 'step-17', x: colWidth*5, y: 750 + rowHeight*2, text: 'Update Active Context', actor: 'ai', type: 'node-automated', command: 'WRITE', step: 17 },
                { id: 'step-18', x: colWidth*7, y: 750 + rowHeight*2, text: 'Mark Test Creation as Complete', actor: 'ai', type: 'node-automated', command: 'WRITE', step: 18 },
                
                // Implementation Phase - Row 1
                { id: 'step-19', x: colWidth*1, y: 1350 + rowHeight*1, text: 'Analyze Test Requirements', actor: 'ai', type: 'node-automated', command: 'DECIDE', step: 19 },
                { id: 'step-20', x: colWidth*3, y: 1350 + rowHeight*1, text: 'Read Test File', actor: 'ai', type: 'node-automated', command: 'READ', step: 20 },
                { id: 'step-21', x: colWidth*5, y: 1350 + rowHeight*1, text: 'Create Implementation File', actor: 'ai', type: 'node-automated', command: 'WRITE', step: 21 },
                { id: 'step-22', x: colWidth*7, y: 1350 + rowHeight*1, text: 'Run Tests', actor: 'ai', type: 'node-automated', command: 'RUN', step: 22 },
                
                // Implementation Phase - Row 2
                { id: 'step-23', x: colWidth*1, y: 1350 + rowHeight*2, text: 'Verify Tests Pass', actor: 'ai', type: 'node-automated', command: 'DECIDE', step: 23 },
                { id: 'step-24', x: colWidth*3, y: 1350 + rowHeight*2, text: 'Refactor Implementation', actor: 'ai', type: 'node-automated', command: 'WRITE', step: 24 },
                { id: 'step-25', x: colWidth*5, y: 1350 + rowHeight*2, text: 'Run Tests After Refactor', actor: 'ai', type: 'node-automated', command: 'RUN', step: 25 },
                { id: 'step-26', x: colWidth*7, y: 1350 + rowHeight*2, text: 'Verify Tests Still Pass', actor: 'ai', type: 'node-automated', command: 'DECIDE', step: 26 },
                
                // Completion Phase - Row 1
                { id: 'step-27', x: colWidth*1, y: 1950 + rowHeight*1, text: 'Update Active Context', actor: 'ai', type: 'node-automated', command: 'WRITE', step: 27 },
                { id: 'step-28', x: colWidth*3, y: 1950 + rowHeight*1, text: 'Mark Feature as Done', actor: 'ai', type: 'node-automated', command: 'WRITE', step: 28 },
                { id: 'step-29', x: colWidth*5, y: 1950 + rowHeight*1, text: 'Update Feature Registry', actor: 'ai', type: 'node-automated', command: 'WRITE', step: 29 },
                { id: 'step-30', x: colWidth*7, y: 1950 + rowHeight*1, text: 'Initiate Next Feature', actor: 'ai', type: 'node-automated', command: 'DECIDE', step: 30 }
            ],
            
            // Connections between nodes - with improved logical flow
            connections: [
                // Initialization Phase - Direct sequential connections
                { from: 'step-1', to: 'step-2', label: 'Start', connectionClass: 'step-connection' },
                { from: 'step-2', to: 'doc-tdd-init', label: 'Read from', connectionClass: 'step-to-doc-connection' },
                { from: 'step-2', to: 'step-3', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-3', to: 'doc-workflow', label: 'Read from', connectionClass: 'step-to-doc-connection' },
                { from: 'step-3', to: 'step-4', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-4', to: 'doc-active-context', label: 'Read from', connectionClass: 'step-to-doc-connection' },
                { from: 'step-4', to: 'step-5', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-5', to: 'step-6', label: 'Decide', connectionClass: 'step-connection' },
                { from: 'step-6', to: 'step-7', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-7', to: 'doc-feature-registry', label: 'Read from', connectionClass: 'step-to-doc-connection' },
                { from: 'step-7', to: 'step-8', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-8', to: 'step-9', label: 'After decision', connectionClass: 'step-connection' },
                { from: 'step-9', to: 'doc-active-context', label: 'Update', connectionClass: 'step-to-doc-connection' },
                { from: 'step-9', to: 'step-10', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-10', to: 'doc-feature-registry', label: 'Update', connectionClass: 'step-to-doc-connection' },
                { from: 'step-10', to: 'step-11', label: 'Move to Test Creation', connectionClass: 'step-connection' },
                
                // Test Creation Phase - Direct sequential connections
                { from: 'step-11', to: 'step-12', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-12', to: 'doc-test-file', label: 'Create', connectionClass: 'step-to-doc-connection' },
                { from: 'step-12', to: 'step-13', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-13', to: 'step-14', label: 'Run', connectionClass: 'step-connection' },
                { from: 'step-14', to: 'step-15', label: 'Verify', connectionClass: 'step-connection' },
                { from: 'step-15', to: 'step-16', label: 'Review', connectionClass: 'step-connection' },
                { from: 'step-16', to: 'step-17', label: 'If approved', connectionClass: 'step-connection' },
                { from: 'step-17', to: 'doc-active-context', label: 'Update', connectionClass: 'step-to-doc-connection' },
                { from: 'step-17', to: 'step-18', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-18', to: 'doc-feature-registry', label: 'Update', connectionClass: 'step-to-doc-connection' },
                { from: 'step-18', to: 'step-19', label: 'Move to Implementation', connectionClass: 'step-connection' },
                
                // Implementation Phase - Direct sequential connections
                { from: 'step-19', to: 'step-20', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-20', to: 'doc-test-file', label: 'Read from', connectionClass: 'step-to-doc-connection' },
                { from: 'step-20', to: 'step-21', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-21', to: 'doc-impl-file', label: 'Create', connectionClass: 'step-to-doc-connection' },
                { from: 'step-21', to: 'step-22', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-22', to: 'step-23', label: 'Run', connectionClass: 'step-connection' },
                { from: 'step-23', to: 'step-24', label: 'If tests pass', connectionClass: 'step-connection' },
                { from: 'step-24', to: 'doc-impl-file', label: 'Update', connectionClass: 'step-to-doc-connection' },
                { from: 'step-24', to: 'step-25', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-25', to: 'step-26', label: 'Run', connectionClass: 'step-connection' },
                { from: 'step-26', to: 'step-27', label: 'If tests pass', connectionClass: 'step-connection' },
                
                // Completion Phase - Direct sequential connections
                { from: 'step-27', to: 'doc-active-context', label: 'Update', connectionClass: 'step-to-doc-connection' },
                { from: 'step-27', to: 'step-28', label: 'Next', connectionClass: 'step-connection' },
                
                { from: 'step-28', to: 'doc-feature-registry', label: 'Update', connectionClass: 'step-to-doc-connection' },
                { from: 'step-28', to: 'step-29', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-29', to: 'step-30', label: 'Next', connectionClass: 'step-connection' },
                { from: 'step-30', to: 'step-1', label: 'Restart process', connectionClass: 'step-connection' },
                // Document relationships
                { from: 'doc-tdd-init', to: 'doc-workflow', label: 'References' },
                { from: 'doc-workflow', to: 'doc-active-context', label: 'Directs' },
                { from: 'doc-active-context', to: 'doc-feature-registry', label: 'Tracks status' }
            ]
        };
        
        // Clear existing content
        flowchart.innerHTML = '';
        
        // Create visual grid for reference (will help with alignment and future updates)
        createGridSystem();
        
        // Create phase separator nodes
        flowchartData.phases.forEach(phase => {
            const phaseNode = document.createElement('div');
            phaseNode.id = phase.id;
            phaseNode.className = 'phase-separator';
            phaseNode.textContent = phase.text;
            phaseNode.style.left = phase.x + 'px';
            phaseNode.style.top = phase.y + 'px';
            phaseNode.setAttribute('data-phase', phase.dataPhase);
            flowchart.appendChild(phaseNode);
        });
        
        // Create document nodes
        flowchartData.documents.forEach(doc => {
            const docNode = document.createElement('div');
            docNode.id = doc.id;
            docNode.className = 'node ' + doc.type;
            docNode.style.left = doc.x + 'px';
            docNode.style.top = doc.y + 'px';
            
            const textSpan = document.createElement('span');
            textSpan.textContent = doc.text;
            
            const filePath = document.createElement('div');
            filePath.className = 'file-path';
            filePath.textContent = doc.path;
            
            docNode.appendChild(textSpan);
            docNode.appendChild(filePath);
            
            docNode.setAttribute('data-path', doc.path);
            
            flowchart.appendChild(docNode);
        });
        
        // Create process nodes
        flowchartData.processes.forEach(process => {
            const processNode = document.createElement('div');
            processNode.id = process.id;
            processNode.className = 'node ' + process.type + ' actor-' + process.actor;
            processNode.style.left = process.x + 'px';
            processNode.style.top = process.y + 'px';
            
            // Add step number
            const stepNumber = document.createElement('div');
            stepNumber.className = 'step-number';
            stepNumber.textContent = process.step;
            processNode.appendChild(stepNumber);
            
            // Add command type label
            const commandLabel = document.createElement('div');
            commandLabel.className = 'command-type command-' + process.command.toLowerCase();
            commandLabel.textContent = process.command;
            commandLabel.style.top = '-30px';
            commandLabel.style.left = '10px';
            processNode.appendChild(commandLabel);
            
            // Add main text
            const textSpan = document.createElement('span');
            textSpan.textContent = process.text;
            processNode.appendChild(textSpan);
            
            // Add actor label
            const actionLabel = document.createElement('div');
            actionLabel.className = 'action-label';
            actionLabel.textContent = process.actor.toUpperCase();
            processNode.appendChild(actionLabel);
            
            flowchart.appendChild(processNode);
        });
        
        // Create connections with optimized path finding
        flowchartData.connections.forEach(connection => {
            drawConnection(connection.from, connection.to, connection.label);
        });
    }
    
    function drawConnection(from, to, label, connectionClass = '') {
        // Calculate the center positions of the nodes, relative to the flowchart
        const fromNode = document.getElementById(from);
        const toNode = document.getElementById(to);
        
        if (!fromNode || !toNode) return;
        
        const fcContainer = document.querySelector('.flowchart-container');
        const fcRect = fcContainer.getBoundingClientRect();
        
        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        
        // Calculate actual positions relative to the flowchart
        const fromX = fromRect.left + fromRect.width / 2 - fcRect.left + fcContainer.scrollLeft;
        const fromY = fromRect.top + fromRect.height / 2 - fcRect.top + fcContainer.scrollTop;
        const toX = toRect.left + toRect.width / 2 - fcRect.left + fcContainer.scrollLeft;
        const toY = toRect.top + toRect.height / 2 - fcRect.top + fcContainer.scrollTop;
        
        // Add edge offsets to connect from/to appropriate sides of nodes
        const edgeOffset = 10;
        let startX = fromX;
        let startY = fromY;
        let endX = toX;
        let endY = toY;
        
        // Determine if both nodes are document types
        const isDocumentConnection = from.startsWith('doc-') && to.startsWith('doc-');
        const isStepToStep = from.startsWith('step-') && to.startsWith('step-');
        const isStepToDoc = from.startsWith('step-') && to.startsWith('doc-');
        const isDocToStep = from.startsWith('doc-') && to.startsWith('step-');
        
        // Calculate angle between nodes to determine best connection points
        const angleRadians = Math.atan2(toY - fromY, toX - fromX);
        const angleDegrees = angleRadians * 180 / Math.PI;
        
        // Get the width/height of from/to nodes
        const fromWidth = fromRect.width;
        const fromHeight = fromRect.height;
        const toWidth = toRect.width;
        const toHeight = toRect.height;
        
        // Determine connection points based on angle and node types
        if (Math.abs(angleDegrees) < 45) { // Connecting right to left
            startX = fromX + fromWidth / 2 - edgeOffset;
            endX = toX - toWidth / 2 + edgeOffset; 
        } else if (Math.abs(angleDegrees) > 135) { // Connecting left to right
            startX = fromX - fromWidth / 2 + edgeOffset;
            endX = toX + toWidth / 2 - edgeOffset;
        } else if (angleDegrees > 45 && angleDegrees < 135) { // Connecting top to bottom
            startY = fromY + fromHeight / 2 - edgeOffset;
            endY = toY - toHeight / 2 + edgeOffset;
        } else { // Connecting bottom to top
            startY = fromY - fromHeight / 2 + edgeOffset;
            endY = toY + toHeight / 2 - edgeOffset;
        }
        
        // Create connection element
        const connection = document.createElement('div');
        connection.className = 'connection ' + connectionClass;
        
        // Special class for document connections
        if (isDocumentConnection) {
            connection.classList.add('document-connection');
        } else if (isStepToStep) {
            connection.classList.add('step-connection');
        } else if (isStepToDoc) {
            connection.classList.add('step-to-doc-connection');
        } else if (isDocToStep) {
            connection.classList.add('doc-to-step-connection');
        }
        
        // Position the connection
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const rotationAngle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
        
        connection.style.width = `${length}px`;
        connection.style.left = `${startX}px`;
        connection.style.top = `${startY}px`;
        connection.style.transform = `rotate(${rotationAngle}deg)`;
        connection.style.transformOrigin = '0 0';
        
        // Check if nodes are in same row or column
        const sameRow = Math.abs(fromY - toY) < 50;
        const sameColumn = Math.abs(fromX - toX) < 50;
        
        // Create label
        if (label) {
            const connectionLabel = document.createElement('div');
            connectionLabel.className = 'connection-label';
            connectionLabel.textContent = label;
            
            // Position the label
            let labelX, labelY;
            
            if (sameRow) {
                // Center the label above the line
                labelX = startX + length / 2 - 40;
                labelY = startY - 25;
            } else if (sameColumn) {
                // Center the label to the right of the line
                labelX = startX + 10;
                labelY = startY + length / 2 - 10;
            } else {
                // Center the label on the line
                labelX = startX + length / 2 * Math.cos(rotationAngle * Math.PI / 180) - 40;
                labelY = startY + length / 2 * Math.sin(rotationAngle * Math.PI / 180) - 25;
            }
            
            connectionLabel.style.left = `${labelX}px`;
            connectionLabel.style.top = `${labelY}px`;
            
            fcContainer.appendChild(connectionLabel);
        }
        
        // Create arrow
        const arrow = document.createElement('div');
        arrow.className = 'arrow';
        
        // Position at the end of the connection
        arrow.style.left = `${length - 10}px`;
        arrow.style.top = '-5px';
        
        connection.appendChild(arrow);
        fcContainer.appendChild(connection);
    }
});
