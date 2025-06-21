# CURRENT TASK - AI DIRECTIVE

**AI DIRECTIVE**: You are to follow the user's instructions EXACTLY as specified. Do not ad-lib, guess, or add extra functionality. Do exactly what the current task requests and nothing more. Do not delete code outside of the current task unless specifically replacing it. Move in small, testable increments that can be verified through console logs or manual visual testing.

## RULES FOR AI ASSISTANT
1. DO NOT ad-lib and do things outside of my specific request. Always do as I request and don't try to guess extra pieces. You are to do exactly as the current task requests and not more.
2. DO NOT delete pieces of code outside of the current task. If something needs to be REPLACED, that's ok. Otherwise DO NOT delete code in files outside of what we're doing.
3. ALL battalions in this effort have the same goals: capture neutral nodes and/or defeat opposing team battalions. That's it. They all have different stats such as attack power, defense, speed, and attack range. Otherwise their tasks are identical.
4. Move SMALL. SMALL actions. We're going to achieve the minimum possible testable solution, which I will manually test. So we only do what we can verify through a console log or through my manual visual test in the smallest possible changes to verify.
5. **ALWAYS update the current task file** whenever debug logs are added - this is mandatory
6. **Be direct about what works and doesn't** - don't sugarcoat issues, be honest about problems
7. **Keep things simple** - do exactly as requested, no more, no less
8. **If user appears to be struggling, help identify where prompts or additional information might help improve responses**

## CURRENT TASK
**Goal**: Get the pathfinder working so battalions follow the network lines

**Current State**: The pathfinder logic should be working in console log theory and not yet in animation/movement. So we should be able to see the logs logically find the nearest enemy or node based on the pathfinder distance. We should verify this for both: finding an enemy or node by proximity && in targeting and retargeting when we're getting ready to animate/move the battalions. Otherwise, nothing else has been implemented.

**Logic Requirements**:
1. When moving, battalions must stay on network lines, which are connected by network nodes.
2. When targeting or retargeting, battalions should use the pathfinder algorithm logic to the next available target.
3. They should watch for either a) their target to be destroyed or captured and if that happens, retarget... and b) watch for targets that come into a closer range of attack and retarget to those. We'll have to think through this a bit and plan for it because I don't want the battalions to constantly 'question themselves' on where to move... it should be maybe once per second or two look for new targets WHILE moving to their new one. Shouldn't interfere with their current actions.
4. They stop when the edge of their attack range reaches the center of the target itself... and only start a new target movement in the conditions set forth in logic point 3 above. They will stop and begin the attack phase and animations. We'll get into those later. For now, let's focus on the movement and targeting and retargeting and pathfinding algorithm.

**Next Steps**: Verify pathfinding console logs are working correctly before implementing movement

## NEXT TASK QUEUE (LIFO - Last In, First Out)
*Empty - no blocking tasks yet*

## CLEANUP TASK
- Debug logs and temporary code created during development
- Any test files or temporary implementations 