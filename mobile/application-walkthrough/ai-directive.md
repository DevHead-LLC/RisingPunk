# AI Directive: Documentation Standards for app-map.md and special-notes.md

**UPDATE (2024-12-29):** Enhanced directive based on assessment of app-map.md and special-notes.md documentation requirements. Added:
- Content Management Requirements section for preserving existing documentation
- MANDATORY FOR ALL CONTRIBUTORS section emphasizing directive compliance
- Phase 5 for Context Limit Management to handle large documentation tasks
- Table of Contents Management section with specific requirements
- Formatting Consistency section with critical rules
- Version Control and Change Tracking section for documentation integrity
- Explicit phase structure update noting cumulative approach
- Context management strategies for maximizing coverage within limits

**UPDATE (2024-12-29):** Restructured for efficient phase-based workflow with clear context management:
- Redesigned phases for optimal context usage
- Added specific context requirements per phase
- Created clear handoff mechanisms between phases
- Established screen-specific file approach
- Added progress tracking system

**UPDATE (2024-12-29):** Established directory-based documentation structure:
- Each screen gets its own directory under `application-walkthrough/screens/`
- Each directory contains `map.md` (user flows) and `special-notes.md` (technical considerations)
- All phases explicitly work with this directory structure
- Bidirectional linking maintained between map and special-notes files

## Purpose
This directive defines the documentation standards for screen-specific `map.md` and `special-notes.md` files. Each screen is documented in its own directory with two files that maintain clear separation between user-facing documentation (map) and technical considerations (special-notes).

## Documentation Structure

### Directory Organization
```
application-walkthrough/
├── ai-directive.md (this file)
└── screens/
    ├── login/
    │   ├── map.md
    │   └── special-notes.md
    ├── turf/
    │   ├── map.md
    │   └── special-notes.md
    ├── battle/
    │   ├── map.md
    │   └── special-notes.md
    └── [screen-name]/
        ├── map.md
        └── special-notes.md
```

### File Purposes
- **map.md**: Documents what users see and do - UI hierarchy, user flows, expected behaviors, screen transitions, and server interactions from a user perspective
- **special-notes.md**: Documents technical considerations - implementation details, security, performance, design decisions, and future improvements

## Core Principles
1. **map.md**: Documents what users see and do - UI hierarchy, user flows, expected behaviors, screen transitions, and server interactions from a user perspective.
2. **special-notes.md**: Documents technical considerations - implementation details, security, performance, design decisions, and future improvements.
3. **No Code**: Never include actual code implementations. Reference behaviors and patterns only.
4. **Bidirectional Linking**: Every screen's map.md must link to its special-notes.md and vice versa.
5. **Context Preservation**: Work in phases to maintain context and avoid information loss.
6. **Appropriate Depth**: Not all screens need all sections - use judgment based on complexity.

## Content Management Requirements
1. **NEVER remove existing content without explicit replacement.**
2. **Always preserve existing sections and their details.**
3. **Add new content in appropriate sections without disrupting existing structure.**
4. **Review all changes methodically to ensure no content loss.**
5. **Document any necessary content removal with clear reasoning.**

## MANDATORY FOR ALL CONTRIBUTORS (INCLUDING AI)
- **This directive MUST be read and followed before making any changes**, especially if you have no prior context.
- **If the documentation process or expectations change, update this directive immediately.**
- **This directive is the single source of truth for documentation style and expectations for both files.**
- **The directives at the top of app-map.md and special-notes.md must also be read and followed.**

## Screen Documentation Workflow

### Pre-Documentation Setup
When starting a new screen:
1. **Announce the screen**: "Documenting [Screen Name] - Phase X of Y"
2. **Create directory**: `application-walkthrough/screens/[screen-name]/`
3. **Create files**: `map.md` and `special-notes.md` in the directory
4. **Create progress tracker**: List all phases needed based on screen complexity
5. **Assess complexity**: Simple (2-3 phases), Medium (3-4 phases), Complex (5+ phases)
6. **Gather initial context**: Screen file path, related components, navigation connections

### Phase-Based Documentation System

## Phase 1: Discovery and Structure (Context: ~30% of window)

### Objective
Understand the screen's purpose, components, and create documentation structure in the screen's directory.

### Context Requirements
- This directive (key sections)
- Screen component file
- Related type definitions
- Navigation/routing setup

### Deliverables
1. **Create directory structure**:
   - Create `application-walkthrough/screens/[screen-name]/`
   - Create `map.md` and `special-notes.md` files

2. **In screens/[screen-name]/map.md**:
   - Add header: `# [Screen Name] - User Flow Documentation`
   - Add link: `> **Technical Notes**: See [special-notes.md](./special-notes.md) for implementation details.`
   - Document basic purpose and entry points
   - List all UI components (names only)
   - Note user-visible features

3. **In screens/[screen-name]/special-notes.md**:
   - Add header: `# [Screen Name] - Technical Notes`
   - Add link: `> **User Flow**: See [map.md](./map.md) for user experience documentation.`
   - List technical components used
   - Note architectural patterns observed
   - Identify security/performance concerns

### Phase 1 Checklist
- [ ] Directory created: `screens/[screen-name]/`
- [ ] Both files created with headers and cross-links
- [ ] Screen purpose documented
- [ ] Entry points identified
- [ ] Component list created (both files)
- [ ] Basic structure established

### Handoff to Phase 2
Document:
- Directory path: `screens/[screen-name]/`
- List of components needing detailed documentation
- Server interactions discovered
- Complex scenarios identified
- Questions or ambiguities

---

## Phase 2: Component Details and User Flows (Context: ~40% of window)

### Objective
Document detailed component behavior and complete user flows in the screen-specific files.

### Context Requirements
- Phase 1 handoff notes
- Component implementation files (2-3 at a time)
- Any custom hooks used
- Error message constants
- The screen's map.md and special-notes.md files

### Deliverables
1. **In screens/[screen-name]/map.md**:
   - Detailed component descriptions (user perspective)
   - Complete user flow documentation
   - Visual positioning and specifications
   - Component interactions
   - Maintain link to special-notes.md

2. **In screens/[screen-name]/special-notes.md**:
   - Component technical details
   - State management approach
   - Performance considerations
   - Implementation patterns
   - Maintain link to map.md

### Phase 2 Checklist
- [ ] All components detailed in map.md
- [ ] User flows documented step-by-step
- [ ] Technical specifications added
- [ ] Component groupings identified
- [ ] Cross-references between files verified
- [ ] Both files remain linked

### Handoff to Phase 3
Document:
- Scenarios needing documentation
- Server endpoints identified
- Error cases discovered
- Missing technical details

---

## Phase 3: Scenarios and Server Interactions (Context: ~40% of window)

### Objective
Document all scenarios, edge cases, and server interactions in the screen-specific files.

### Context Requirements
- Phase 2 handoff notes
- API/service files
- Server route definitions
- Error handling code
- The screen's map.md and special-notes.md files

### Deliverables
1. **In screens/[screen-name]/map.md**:
   - All scenarios documented (happy path + edge cases)
   - Server interactions from user perspective
   - Error messages (exact text)
   - Form validations
   - Maintain all cross-references

2. **In screens/[screen-name]/special-notes.md**:
   - API endpoint details
   - Authentication requirements
   - Data flow patterns
   - Security considerations
   - Future improvements for this screen

### Phase 3 Checklist
- [ ] Standard flow documented
- [ ] All edge cases covered
- [ ] Error scenarios complete
- [ ] Server details documented
- [ ] Security items marked (✅/⚠️)

### Handoff to Phase 4
Document:
- Complex scenarios needing expansion
- Performance concerns identified
- Future improvements suggested
- Cross-references needed

---

## Phase 4: Polish and Cross-References (Context: ~30% of window)

### Objective
Add all cross-references, future considerations, and final polish to the screen-specific files.

### Context Requirements
- All previous handoff notes
- Both screen-specific files
- Related screen documentation (other directories)
- Overall app structure

### Deliverables
1. **In both screen files**:
   - Verify bidirectional linking between map.md and special-notes.md
   - Add links to related screens (use relative paths)
   - Future considerations documented
   - TODO items properly formatted
   - Formatting consistency checked

### Phase 4 Checklist
- [ ] All cross-references working
- [ ] Future considerations grouped by category
- [ ] Performance notes complete
- [ ] Design notes added
- [ ] Final formatting review

### Handoff to Phase 5 (if needed)
Document:
- Any remaining complex sections
- Items exceeding context limits
- Special considerations

---

## Phase 5+: Complex Screen Extensions (Context: Variable)

### When Needed
- Screens with 10+ major components
- Multiple complex subsystems
- Extensive animation systems
- Complex state management

### Approach
1. Break into logical subsystems
2. Document each subsystem in dedicated phase
3. Maintain running checklist of completed sections
4. Use consistent TODO markers for pending work

---

## Progress Tracking Template

Use this template when starting each screen:

```markdown
## [Screen Name] Documentation Progress

**Complexity**: [Simple/Medium/Complex]
**Total Phases**: [Number]
**Current Phase**: [X of Y]

### Phase Breakdown:
- [ ] Phase 1: Discovery and Structure
- [ ] Phase 2: Component Details and User Flows  
- [ ] Phase 3: Scenarios and Server Interactions
- [ ] Phase 4: Polish and Cross-References
- [ ] Phase 5: [Specific subsystem if needed]

### Current Focus:
[What we're documenting in this phase]

### Handoff from Previous Phase:
[Key items from previous phase]

### Notes for Next Phase:
[Items to address in next phase]
```

## Context Management Best Practices

### Efficient Context Usage
1. **Read only what's needed** - Don't load entire files if only checking structure
2. **Batch similar items** - Group related components in same phase
3. **Use search effectively** - Search for specific patterns rather than reading everything
4. **Document immediately** - Don't hold information in memory across phases

### Phase Transitions
1. **Clear handoffs** - Document what next phase needs to know
2. **Progress tracking** - Update checklist after each phase
3. **Context summary** - Brief summary of what was accomplished
4. **TODO markers** - Clear markers for incomplete items

### Multi-Agent Compatibility
1. **Self-contained phases** - Each phase should be executable independently
2. **Clear state** - Document current state at phase start/end
3. **No assumptions** - Don't assume knowledge from previous phases
4. **Explicit instructions** - Be clear about what needs to be done

## Screen Complexity Guidelines

### Simple Screens (2-3 phases)
- Basic navigation screens
- Simple forms (1-2 inputs)
- Display-only screens
- Minimal server interaction

### Medium Screens (3-4 phases)
- Multi-step forms
- Screens with 4-8 components
- Standard CRUD operations
- Multiple navigation paths

### Complex Screens (5+ phases)
- Game/battle screens
- Multi-modal interfaces
- Complex state management
- Extensive animations
- 10+ components

## File Organization

### Directory Structure for Screens
1. **One directory per screen**: `application-walkthrough/screens/[screen-name]/`
2. **Consistent files**:
   - `map.md` - User flow and experience
   - `special-notes.md` - Technical and future considerations
3. **Cross-linking**: Every map.md links to its special-notes.md and vice versa

### File Headers Template
```markdown
<!-- In screens/[screen-name]/map.md -->
# [Screen Name] - User Flow Documentation

> **Technical Notes**: See [special-notes.md](./special-notes.md) for implementation details, security considerations, and future improvements.

## Overview
[Screen description]

<!-- In screens/[screen-name]/special-notes.md -->
# [Screen Name] - Technical Notes

> **User Flow**: See [map.md](./map.md) for user experience documentation and detailed flow descriptions.

## Overview
[Technical overview]
```

## Quality Assurance

### Before Completing Each Phase
1. **Check completeness** - All checklist items done?
2. **Verify accuracy** - Information matches source code?
3. **Test cross-references** - Links work correctly?
4. **Review formatting** - Consistent with standards?
5. **Document handoff** - Next phase has what it needs?

### Common Pitfalls to Avoid
1. **Don't skip handoffs** - They're crucial for context
2. **Don't combine phases** - Respect context limits
3. **Don't assume knowledge** - Be explicit
4. **Don't lose details** - Use TODO markers if needed
5. **Don't repeat unnecessarily** - Combine related items

## Enforcement
- This directive is mandatory for all contributors and AI
- Update this directive when patterns change
- All screens must follow this structure for consistency
- Work on one screen at a time to maintain context
- Complex screens may require multiple passes
- Simple screens should not be over-documented
- Always follow the established format from previous sections
- Each phase must be self-contained and executable independently

## Appendix A: Detailed Section Requirements

### For map.md (in screen directories) - Required Sections (use if applicable):

#### Implementation/User Experience Flow
- What happens when user enters the screen
- Step-by-step user interactions
- What UI elements are visible
- Expected behaviors
- Multiple numbered subsections for complex flows
- For simple screens: Can be a single paragraph with bullet points

#### Main Components
- List each major UI component
- Brief description of what it does (user perspective)
- Visual positioning if relevant
- Technical specifications when user-facing:
  - Dimensions (e.g., "2000x2000 pixels")
  - Z-index layering (e.g., "Z-index: 1")
  - Transform values (e.g., "Transform: translate(-60px, -80px)")
- Component grouping
- Inline implementation cross-references: `> **Implementation**: See [Section](./special-notes.md#section)`

#### Scenarios & Outcomes
- Standard flow (happy path)
- Edge cases with parenthetical notes
- Error scenarios with specific error messages
- Form validation scenarios (if forms exist)
- Network failure scenarios
- Server flow and client flow separation
- Button state changes
- Navigation scenarios
- Screen state management scenarios
- Animation and performance scenarios

#### Screen Transitions
- Entry points (how user gets here)
- Exit points (where user can go)
- Navigation triggers
- State preservation notes
- Form switching behavior (if applicable)
- Nested navigation paths
- Links to related screens: `[Next Screen](../next-screen/map.md)`

#### Server Details (if any server interaction)
- What data is fetched
- What actions trigger server requests
- Expected responses from user perspective
- Error states user might see
- Token/session management from user perspective
- Use "may" for conditional interactions

### For special-notes.md (in screen directories) - Required Sections (use if applicable):

#### Implementation Details
- Technical architecture decisions
- State management approach
- Component optimization strategies
- Memory management considerations
- Component structure diagram (if helpful)
- Form management details
- Validation logic approach
- TODO notes for future work
- Link back to user flow: `> **User Flow**: See [map.md](./map.md#section)`

#### Security Considerations
- Authentication/authorization requirements
- Data validation approaches
- Sensitive data handling
- Security vulnerabilities to watch
- Checkmarks for implemented features (✅)
- Warning symbols for considerations (⚠️)

#### Performance Considerations
- Optimization strategies
- Known bottlenecks
- Animation performance
- State update efficiency
- Re-render optimization
- Memory management
- Component optimization details
- Navigation handling performance
- Asset management strategies

#### Server-Side Notes
- API endpoints involved
- Authentication requirements
- Data flow patterns
- Error handling strategies
- JWT token details
- Database operations

#### Future Considerations
- Known limitations
- Planned improvements
- Alternative approaches considered
- Accessibility needs
- Grouped by category (Error Handling, UX, Security, Performance)
- Implementation priority notes

## Appendix B: Formatting Standards

### Headers
- Level 1 (#) for file title only
- Level 2 (##) for main sections
- Level 3 (###) for subsections  
- Level 4 (####) for sub-scenarios or component groups

### Lists
- Numbered lists for step-by-step flows
- Bulleted lists for component descriptions or simple scenarios
- Indented sub-items for details

### Cross-References
- Within same directory: `[Section](./special-notes.md#section)` or `[Section](./map.md#section)`
- To other screens: `[Screen Name](../other-screen/map.md)`
- Inline: `> **Implementation**: See [Section](./special-notes.md#section)`
- End of section (single): `> For technical details, see [Special Notes](./special-notes.md).`
- End of section (grouped):
  ```
  > **Technical Details**: See [Implementation](./special-notes.md#implementation)
  > 
  > **Security**: See [Security Considerations](./special-notes.md#security)
  > 
  > **Future Work**: See [Future Considerations](./special-notes.md#future)
  ```

### Special Formatting
- Error messages in quotes: "ACCESS_DENIED: CREDENTIALS_REQUIRED"
- Technical specs with units: "2000x2000 pixels", "Z-index: 1"
- TODO format: `(TODO: Description)`
- Security markers: ✅ implemented, ⚠️ consideration
- Performance notes: `> **Current Limitations**: Description`
- Implementation priority: `> **Implementation Priority**: High - reason`

## Appendix C: Table of Contents Management

### Screen Directory TOC
Each screen's map.md and special-notes.md should have its own TOC:

```markdown
<!-- In screens/[screen-name]/map.md -->
## Table of Contents
1. [Overview](#overview)
2. [User Experience Flow](#user-experience-flow)
3. [Main Components](#main-components)
4. [Scenarios & Outcomes](#scenarios--outcomes)
5. [Screen Transitions](#screen-transitions)
6. [Server Details](#server-details)

<!-- In screens/[screen-name]/special-notes.md -->
## Table of Contents
1. [Overview](#overview)
2. [Implementation Details](#implementation-details)
3. [Security Considerations](#security-considerations)
4. [Performance Considerations](#performance-considerations)
5. [Server-Side Notes](#server-side-notes)
6. [Future Considerations](#future-considerations)
```

## Appendix D: Version Control

### Documentation Updates
1. **Directive Updates**: Add dated update notes
   - Format: `**UPDATE (YYYY-MM-DD):** Description`
   - Keep updates cumulative
2. **TODO Tracking**: Use consistent format
   - In-line: `(TODO: Description)`
   - Section placeholder: `[TODO: Detail specific aspect]`
3. **Phase Completion**: Note in file headers
   - Example: `<!-- Phase 1 Complete, Phase 2 In Progress -->`
4. **Content Removal**: Document why
   - Add note: `> **Note**: [Section] removed because [reason]`

### Directory Creation Tracking
When creating new screen directories:
```bash
# Example commit message
git add application-walkthrough/screens/battle/
git commit -m "docs: Create Battle Screen documentation structure - Phase 1"
``` 