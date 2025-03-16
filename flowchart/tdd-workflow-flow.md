# TDD Workflow Process Flow

This document outlines the complete Test-Driven Development (TDD) workflow process from initialization through implementation. It serves as a reference for understanding the flowchart and the overall TDD process.

## Command Types & Actors Legend

### Command Types
- **READ**: Reading files or information
- **WRITE**: Creating or updating files
- **DECIDE**: Making a decision based on conditions
- **RUN**: Executing scripts or commands

### Actors
- **USER**: Human user interacting with the system
- **AI**: AI assistant performing automated tasks
- **FILE**: File-based directives

### Directors
- **Directed By User Action**: Commands initiated by user request
- **Directed By File Directive**: Commands directed by instructions in files
- **Directed By AI Action**: Commands determined by AI based on context

## Detailed Workflow

### Initialization Phase

1. **[USER/ACTION]** User provides `tdd-initialize.mdc` file
   - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/tdd-initialize.mdc`
   - Box Color: Blue (Information)
   - This is the entry point that triggers the workflow

2. **[AI/DECIDE]** Environment validation
   - Directed By: File Directive
   - Check if all required tools are available
   - Verify repository access and permissions
   - Box Color: Yellow (Manual Process)

3. **[AI/READ]** Parse FIRST_ACTION directive
   - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/tdd-initialize.mdc`
   - Section: INITIALIZATION COMMAND
   - Directed By: File Directive
   - Box Color: Green (Automated Process)
   - Points to workflow-directive.mdc

4. **[AI/READ]** Read initialization file
   - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/context/tdd/workflow-directive.mdc`
   - Directed By: User Action
   - Purpose: Understand TDD workflow instructions
   - Box Color: Blue (Information)

5. **[AI/READ]** Load AI Directive Tree
   - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/ai-directives/tdd-workflow.mdc`
   - Directed By: File Directive (NEXT FILE TO READ)
   - Purpose: Parse Master Directive to understand workflow structure
   - Box Color: Blue (Information)

6. **[AI/READ]** Check active working context
   - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/context/tdd/active-working-context.mdc`
   - Directed By: workflow-directive.mdc (NEXT FILE TO READ)
   - Purpose: Check current workflow state and position
   - Box Color: Green (Automated Process)

7. **[AI/DECIDE]** Determine workflow position
   - Directed By: active-working-context.mdc
   - Evaluates status markers: [to-do], [in-progress], [done]
   - Decision diamond in flowchart
   - Box Color: Yellow (Manual Process)
   - Branches:
     - If any step [in-progress]: Continue from that point
     - If all steps [to-do]: Begin with Reset Context
     - If all steps [done]: Begin with Reset Context

8. **[AI/WRITE]** Update context with decision
   - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/context/tdd/active-working-context.mdc`
   - Directed By: active-working-context.mdc (NEXT DIRECTIVE ACTION)
   - Records current workflow position
   - Box Color: Yellow (Manual Process)

9. **[AI/READ]** Read AI Directives and Directive Tree
   - Paths: Multiple directive files based on context
   - Directed By: active-working-context.mdc (NEXT DIRECTIVE ACTION)
   - Purpose: Load all necessary directive files
   - Box Color: Yellow (Manual Process)

10. **[AI/READ]** Examine feature registry
    - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/gameplay/intended-features/`
    - Directed By: tdd-workflow.mdc (STATUS UPDATE INSTRUCTIONS)
    - Purpose: Identify features marked [ready] for implementation
    - Box Color: Green (Automated Process)

11. **[AI/WRITE]** Update Reset Content status
    - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/context/tdd/active-working-context.mdc`
    - Change: [to-do] → [in-progress]
    - Directed By: tdd-workflow.mdc (STATUS UPDATE INSTRUCTIONS)
    - Box Color: Yellow (Manual Process)

12. **[AI/WRITE]** Update workflow statuses
    - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/ai-directives/tdd-workflow.mdc`
    - Updates:
      - "Reset Content" status: [to-do] → [in-progress]
      - "Check Content" status: [to-do] → [in-progress]
      - "Directory and Workspace Status" status: [to-do] → [in-progress]
    - Directed By: tdd-workflow.mdc (STATUS UPDATE INSTRUCTIONS)
    - Box Color: Yellow (Manual Process)

13. **[AI/RUN]** Context synchronization
    - Command: `sync-context.sh`
    - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/tdd/scripts/sync-context.sh`
    - Directed By: tdd-workflow.mdc (SYNC CONTEXT directive)
    - Purpose: Ensure all context files are synchronized
    - Box Color: Yellow (Manual Process)

### Test Creation Phase

14. **[AI/DECIDE]** Verify codebase structure
    - Check: `server/src/features/` and `server/tdd/tests/` directories
    - Directed By: workflow-directive.mdc (NEXT FILE TO READ)
    - Create directories if missing
    - Box Color: Yellow (Manual Process)

15. **[AI/DECIDE]** Select feature to implement
    - Based on: Feature registry, dependencies, and priorities
    - Directed By: active-working-context.mdc (NEXT DIRECTIVE ACTION)
    - Box Color: Yellow (Manual Process)

16. **[AI/WRITE]** Generate test files
    - Path: `server/tdd/tests/[feature-name].test.ts`
    - Content: Failing tests for the feature
    - Directed By: tdd-workflow.mdc
    - Box Color: Yellow (Manual Process)

17. **[AI/WRITE]** Create implementation scaffolding
    - Path: `server/src/features/[feature-name].ts`
    - Content: Empty function definitions and imports
    - Directed By: tdd-workflow.mdc
    - Box Color: Yellow (Manual Process)

18. **[AI/RUN]** Verify test failure
    - Command: `npm test -- [feature-name]`
    - Directed By: tdd-workflow.mdc
    - Purpose: Ensure tests fail properly
    - Box Color: Yellow (Manual Process)

19. **[AI/WRITE]** Update implementation plan
    - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/context/tdd/active-working-context.mdc`
    - Content: Test implementation order and criteria
    - Directed By: tdd-workflow.mdc
    - Box Color: Yellow (Manual Process)

20. **[AI/WRITE]** Update feature registry
    - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/gameplay/intended-features/[feature].mdc`
    - Change: [ready] → [in-progress]
    - Directed By: tdd-workflow.mdc
    - Box Color: Yellow (Manual Process)

### Implementation Phase (TDD Cycle)

21. **[AI/READ]** Review failing tests
    - Path: `server/tdd/tests/[feature-name].test.ts`
    - Directed By: active-working-context.mdc (NEXT DIRECTIVE ACTION)
    - Purpose: Understand requirements for implementation
    - Box Color: Yellow (Manual Process)

22. **[AI/WRITE]** Implement minimal code
    - Path: `server/src/features/[feature-name].ts`
    - Purpose: Make tests pass with minimal implementation
    - Directed By: tdd-workflow.mdc
    - Box Color: Yellow (Manual Process)

23. **[AI/RUN]** Verify tests pass
    - Command: `npm test -- [feature-name]`
    - Directed By: tdd-workflow.mdc
    - Purpose: Confirm implementation meets requirements
    - Box Color: Yellow (Manual Process)

24. **[AI/WRITE]** Refactor code
    - Path: `server/src/features/[feature-name].ts`
    - Purpose: Improve code quality while maintaining passing tests
    - Directed By: tdd-workflow.mdc
    - Box Color: Yellow (Manual Process)

25. **[AI/RUN]** Verify refactored code
    - Command: `npm test -- [feature-name]`
    - Directed By: tdd-workflow.mdc
    - Purpose: Ensure refactoring didn't break functionality
    - Box Color: Yellow (Manual Process)

### Completion Phase

26. **[AI/WRITE]** Update feature documentation
    - Path: Varies based on feature
    - Directed By: tdd-workflow.mdc
    - Purpose: Document implemented feature
    - Box Color: Yellow (Manual Process)

27. **[AI/WRITE]** Update feature registry
    - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/gameplay/intended-features/[feature].mdc`
    - Change: [in-progress] → [done]
    - Directed By: tdd-workflow.mdc
    - Box Color: Yellow (Manual Process)

28. **[AI/WRITE]** Update context files
    - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/context/tdd/active-working-context.mdc`
    - Change: Mark current phase as [done]
    - Set next action to next feature
    - Directed By: tdd-workflow.mdc
    - Box Color: Yellow (Manual Process)

29. **[AI/RUN]** Final context synchronization
    - Command: `sync-context.sh`
    - Path: `/Users/robertthiel/DevHead_LLC/RisingPunk/rules/tdd/scripts/sync-context.sh`
    - Directed By: tdd-workflow.mdc
    - Box Color: Yellow (Manual Process)

30. **[AI/DECIDE]** Transition to next feature
    - Evaluate: Next feature to implement
    - Directed By: active-working-context.mdc
    - Purpose: Begin next cycle or complete workflow
    - Box Color: Yellow (Manual Process)

## Flowchart Representation

The flowchart visualizes this process with:
- **Blue boxes**: Information and context
- **Green boxes**: Automated processes
- **Yellow boxes**: Manual actions and decisions
- **Connecting arrows**: Flow between steps
- **Labels on arrows**: Direction commands (Directed By User Action, Directed By File Directive, etc.)
- **Diamond shapes**: Decision points

Command boxes at the top of the flowchart (READ, WRITE, RUN, DECIDE) represent the fundamental operations that occur throughout the workflow, directed by different sources (AI, User, File) as indicated by connecting arrows.

## Status Markers

Throughout the workflow, status markers track progress:
- **[to-do]**: Task not yet started
- **[in-progress]**: Task currently being worked on
- **[done]**: Task completed successfully

## Key Files

1. **Directive Files**:
   - `tdd-initialize.mdc`: Entry point for initialization
   - `tdd-workflow.mdc`: AI Directive Tree with complete rules

2. **Context Files**:
   - `active-working-context.mdc`: Current workflow state
   - Feature registry files in `rules/gameplay/intended-features/`

3. **Implementation Files**:
   - Test files in `server/tdd/tests/`
   - Implementation files in `server/src/features/`

## Flow Control

The workflow is controlled by:
- **AI Directives**: Define rules and expectations
- **File Directives**: Provide specific instructions within files
- **User Actions**: Manual interventions and decisions
- **Status Markers**: Track progress and determine next steps

This structured approach ensures consistent, high-quality test-driven development that results in well-tested, maintainable code implementing the specified features. 