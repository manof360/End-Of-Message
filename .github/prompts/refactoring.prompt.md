# Refactoring Methodology Prompt

**Autonomous Agent Instruction**: When refactoring code, follow this safe approach. Refactoring is changing structure without changing behavior - verify this throughout.

## Refactoring Principle

**CORE RULE**: Refactoring must not change user-visible behavior. If behavior changes, it's a bug fix or feature, not refactoring.

```
Good refactoring:
- Extract method (same behavior, clearer code)
- Rename variable (same behavior, better name)
- Simplify expression (same logic, clearer intent)
- Move function (same code, better organization)

Not refactoring:
- Add feature (new behavior)
- Fix bug (corrects broken behavior)
- Optimize (changes performance characteristics)
- Restructure with type changes (changes interface)
```

---

## Pre-Refactoring Checklist

**BEFORE touching code**:

- [ ] Tests passing on current code
- [ ] Understand current behavior completely
- [ ] Identify all usages of code being refactored
- [ ] Plan refactoring in atomic commits
- [ ] Have rollback plan ready

**Verify tests**:
```bash
npm test
# All tests must pass before refactoring
```

**Find all usages**:
```bash
vscode_listCodeUsages {
  symbol: "functionToRefactor"
  filePath: "src/lib/function.ts"
  lineContent: "export function functionToRefactor"
}
# List all places using this function
```

---

## Refactoring Strategy

### Phase 1: Understand Current Code

**For code being refactored**:
1. Read through completely
2. Identify purpose of each line
3. List all inputs and outputs
4. Understand edge cases
5. Find all callers (usages)

**Example**:
```typescript
// Current code
function processMessage(msg: Message) {
  const text = msg.content.trim();
  const hasError = msg.error !== null;
  if (hasError) throw new Error(msg.error);
  
  const recipients = msg.recipients || [];
  for (let i = 0; i < recipients.length; i++) {
    send(recipients[i], text);
  }
}

// Understanding:
// - Input: Message with content, error, recipients
// - Output: Sends message to each recipient
// - Edge case: Empty recipients
// - Edge case: Error in message
// - Callers: 3 places
```

### Phase 2: Plan Refactoring

**For each refactoring**:
1. What's being changed?
2. Why is it better?
3. What tests verify behavior unchanged?
4. Rollback plan if tests fail?

**Examples**:

**Refactoring A: Extract validation**
```
Before: Error check mixed with logic
After: Separate function for validation
Benefit: Testable, reusable, clearer intent
Tests: Same test cases, different test structure
Rollback: Inline function back
```

**Refactoring B: Simplify loop**
```
Before: for (let i = 0; i < arr.length; i++) { ... }
After: for (const item of arr) { ... }
Benefit: More readable, less error-prone
Tests: Same behavior (test doesn't know loop style)
Rollback: Change back to indexed loop
```

### Phase 3: Make Atomic Changes

**KEY PRINCIPLE**: One change per commit.

```
❌ Wrong
git commit -m "refactor: improve message processing"
# Changes: Extract function, rename variables, simplify loop

✓ Right
git commit -m "refactor: extract validation into separate function"
# Changes: Only extract function

git commit -m "refactor: use for-of loop instead of indexed"
# Changes: Only loop style change

git commit -m "refactor: rename recipient to recipient variable"
# Changes: Only naming change
```

**Why atomic**?
- Easy to review each change
- Easy to revert one change if it breaks something
- Git blame tells full story
- Easy to understand in future

### Phase 4: Test After Each Change

**After each commit**:
```bash
npm test
# All tests still pass?

npm run build
# TypeScript strict still passes?

npm run lint
# No new lint warnings?
```

**If test fails**:
1. Revert last commit
2. Understand what broke
3. Make smaller change
4. Test again

### Phase 5: Verify Behavior Unchanged

**Compare before/after**:

```typescript
// Same input → Same output
const input = testData;

// Old version
const oldResult = processMessage_Old(input);

// New version
const newResult = processMessage_New(input);

// Verify identical
console.assert(
  JSON.stringify(oldResult) === JSON.stringify(newResult),
  'Behavior changed!'
);
```

---

## Common Refactoring Patterns

### Pattern 1: Extract Function

**When**: Code doing multiple things
**How**: Pull out related lines into function
**Test**: Same test cases pass

```typescript
// Before
function handleMessage(msg) {
  const text = msg.content.trim();
  if (!text) throw new Error('Empty message');
  const recipients = msg.recipients || [];
  for (const recipient of recipients) {
    send(recipient, text);
  }
}

// After
function validateMessage(msg: Message): string {
  const text = msg.content.trim();
  if (!text) throw new Error('Empty message');
  return text;
}

function handleMessage(msg: Message) {
  const text = validateMessage(msg);
  const recipients = msg.recipients || [];
  for (const recipient of recipients) {
    send(recipient, text);
  }
}
```

### Pattern 2: Rename for Clarity

**When**: Variable names unclear
**How**: Use IDE rename (ensures all usages updated)
**Test**: Same test cases pass

```typescript
// Before
const f = (x) => x > 10 ? x * 2 : x;

// After (clearer intent)
const doubleIfLarge = (value) => value > 10 ? value * 2 : value;
```

### Pattern 3: Simplify Expression

**When**: Complex condition or logic
**How**: Extract intermediate variables or use clearer operators
**Test**: Same behavior with test cases

```typescript
// Before
if (!msg.recipients || msg.recipients.length === 0) { ... }

// After (clearer)
const hasRecipients = msg.recipients && msg.recipients.length > 0;
if (!hasRecipients) { ... }
```

### Pattern 4: Move Code

**When**: Function in wrong location
**How**: Cut from source, paste to destination, update imports
**Test**: Same behavior (tests import from new location)

```typescript
// Before: In src/components/MessageForm.tsx
function validateMessage(msg) { ... }

// After: In src/lib/validation.ts
export function validateMessage(msg) { ... }

// Updated import in MessageForm.tsx
import { validateMessage } from '@/lib/validation';
```

---

## Anti-Refactoring (What NOT to do)

**❌ Don't refactor if**:
- Tests not passing (fix tests first)
- Code is working (don't touch working code)
- Purpose unclear (understand first)
- No clear benefit (just tinkering)
- Already scheduled for deprecation

**❌ Don't combine refactoring with**:
- Bug fixes (do separately)
- Feature additions (do separately)
- Performance optimizations (do separately)
- Breaking changes (not refactoring)

**❌ Don't refactor without**:
- Tests (need to verify behavior unchanged)
- Understanding purpose (or you'll break it)
- Planning (commit-by-commit)
- Testing after each change (catch regressions early)

---

## Type-Safe Refactoring

**Preserve TypeScript safety**:

```typescript
// ❌ Breaks type safety
const value: any = getData();  // Loses type info

// ✓ Maintains type safety
const value = getData(); // Type inferred correctly
// If return type changes, compiler catches it
```

**Verify types after refactoring**:
```bash
npm run type-check
# tsc --noEmit must still pass
```

---

## Refactoring Code Review

**When reviewing refactoring**:
- [ ] Behavior unchanged (same test cases pass)
- [ ] Each commit is atomic (one idea per commit)
- [ ] Type safety maintained
- [ ] No new lint warnings
- [ ] Variable names clearer
- [ ] Code more maintainable
- [ ] Tests still pass
- [ ] Build still succeeds

---

## When to Stop Refactoring

**Refactoring is done when**:
- [ ] All tests pass
- [ ] Code clearer/more maintainable
- [ ] No more obvious improvements
- [ ] Benefit no longer worth effort
- [ ] You can explain why each change

**Red flag**: Refactoring taking longer than expected?
- Stop and commit what you have
- Revert if stuck
- Get help if needed
- Don't over-engineer

---

## Refactoring Rollback

**If refactoring breaks something**:

```bash
# Revert last commit
git revert <commit-hash>

# Or reset to before refactoring
git reset --hard <before-hash>
```

**Learn from broken refactoring**:
- Why did it fail?
- What test would have caught it?
- How to prevent next time?
- Update test coverage

---

## Autonomous Refactoring Constraints

**You can refactor independently**:
- ✓ Extract functions (clearer structure)
- ✓ Rename variables (clarity)
- ✓ Simplify expressions (readability)
- ✓ Move code to better location (organization)
- ✓ Reduce duplication (DRY principle)

**Escalate before refactoring**:
- ✗ Changing API contracts
- ✗ Removing public functions
- ✗ Restructuring modules
- ✗ Breaking backward compatibility

**Rule**: If unsure, escalate rather than risk breaking change.
