---
name: ai-integration
description: "Use when: integrating LLMs, implementing RAG systems, managing agent workflows, preventing hallucinations, building retrieval systems"
---

# AI Integration Skill

Specialist in large language model integration, prompt engineering, retrieval augmented generation (RAG), and AI system reliability.

## LLM Integration Patterns

### Safe Prompt Construction

```typescript
// ✓ Good: Clear system prompt + user input separation
async function generateMessageSummary(userMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    temperature: 0.7,
    max_tokens: 200,
    system: `You are a professional message summarizer. 
Summarize the given message in 1-2 sentences.
Be factual and concise.`,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });
  
  return response.choices[0].message.content;
}

// ✗ Bad: Mixing system + user input
const prompt = `Summarize this: ${userInput}`; // User could inject prompts!
```

### Hallucination Prevention

```typescript
// ✓ Good: Ground responses in real data (RAG)
async function answerQuestion(question: string, userId: string): Promise<string> {
  // 1. Retrieve relevant context from database
  const relevantMessages = await searchMessages(userId, question);
  
  // 2. Build context from real data
  const context = relevantMessages
    .map(m => `Message: "${m.title}"\nContent: ${m.content}`)
    .join('\n---\n');
  
  // 3. Use context to ground response
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    temperature: 0.3, // Lower temperature = more factual
    system: `You are an assistant for message management.
Answer questions based ONLY on the provided messages.
If information is not in the provided messages, say "I don't have that information".`,
    messages: [
      {
        role: 'user',
        content: `Based on these messages:\n\n${context}\n\nAnswer: ${question}`,
      },
    ],
  });
  
  return response.choices[0].message.content;
}

// ✗ Bad: No grounding (LLM makes up facts)
const response = await openai.chat.completions.create({
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: question }],
});
```

## Retrieval Augmented Generation (RAG)

### Semantic Search

```typescript
// lib/embedding.ts
import { openai } from '@ai-sdk/openai';

// Vectorize text using OpenAI embeddings
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  
  return response.data[0].embedding;
}

// Store embeddings in database
async function indexMessage(message: Message): Promise<void> {
  const embedding = await getEmbedding(message.content);
  
  await prisma.messageEmbedding.create({
    data: {
      messageId: message.id,
      embedding: embedding, // Store as vector in DB
      version: 1, // For re-embedding old messages
    },
  });
}

// Search by semantic similarity
async function semanticSearch(
  query: string,
  userId: string,
  limit: number = 5
): Promise<Message[]> {
  const queryEmbedding = await getEmbedding(query);
  
  // Use PostgreSQL vector similarity
  const similarMessages = await prisma.$queryRaw`
    SELECT m.* FROM message m
    JOIN message_embedding me ON me.message_id = m.id
    WHERE m.user_id = ${userId}
    ORDER BY me.embedding <-> ${JSON.stringify(queryEmbedding)}
    LIMIT ${limit}
  `;
  
  return similarMessages;
}
```

### Vector Database Setup

```typescript
// Enable vector extension in PostgreSQL
// CREATE EXTENSION vector;

// Prisma schema
model MessageEmbedding {
  id        String @id @default(cuid())
  messageId String @unique
  embedding  Unsupported("vector")?  // PostgreSQL vector type
  version   Int @default(1)
  
  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  
  @@index([version])
}
```

## Prompt Engineering

### Few-Shot Prompting

```typescript
async function classifyMessageSeverity(
  messageContent: string
): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    temperature: 0,
    system: `You are a message severity classifier.
Classify messages into severity levels based on content and urgency.
Respond with ONLY the classification: LOW, MEDIUM, HIGH, or CRITICAL.`,
    messages: [
      {
        role: 'user',
        content: `Classify severity:

Example 1: "Please update your profile" → LOW
Example 2: "System will be unavailable Friday 2-4am" → MEDIUM
Example 3: "Security breach detected" → HIGH
Example 4: "IMMEDIATE ACTION REQUIRED - evacuate building" → CRITICAL

Now classify: "${messageContent}"`,
      },
    ],
  });
  
  return response.choices[0].message.content.trim() as any;
}
```

### Chain-of-Thought Prompting

```typescript
async function analyzeMessageImpact(messageContent: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    temperature: 0.5,
    system: `You are an expert at analyzing message impact.
Think through your analysis step by step.`,
    messages: [
      {
        role: 'user',
        content: `Analyze this message and its potential impact:

"${messageContent}"

Think step by step:
1. What is the main purpose of this message?
2. Who are the intended recipients?
3. What actions might they take?
4. What could be the immediate impact?
5. What could be the long-term impact?

Then provide your overall impact assessment.`,
      },
    ],
  });
  
  return response.choices[0].message.content;
}
```

## Agent Orchestration

### Multi-Step Agent Workflow

```typescript
// ✓ Good: Stateful agent workflow
interface AgentState {
  step: 'START' | 'RESEARCH' | 'DRAFT' | 'REVIEW' | 'PUBLISH';
  context: Record<string, string>;
  errors: string[];
}

async function messageCreationAgent(
  userRequest: string
): Promise<{ success: boolean; message?: Message; error?: string }> {
  let state: AgentState = {
    step: 'START',
    context: { userRequest },
    errors: [],
  };
  
  // Step 1: Research similar messages
  state.step = 'RESEARCH';
  const similar = await semanticSearch(userRequest, userId, 3);
  state.context.similarMessages = JSON.stringify(similar);
  
  // Step 2: Draft message
  state.step = 'DRAFT';
  const draftResponse = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'user',
        content: `Based on similar messages: ${state.context.similarMessages}
Draft a new message for: ${userRequest}`,
      },
    ],
  });
  state.context.draft = draftResponse.choices[0].message.content;
  
  // Step 3: Review for issues
  state.step = 'REVIEW';
  const review = await validateMessage(state.context.draft);
  if (!review.valid) {
    state.errors.push(review.error);
    return { success: false, error: review.error };
  }
  
  // Step 4: Create in database
  state.step = 'PUBLISH';
  const message = await prisma.message.create({
    data: {
      userId,
      title: userRequest,
      content: state.context.draft,
    },
  });
  
  return { success: true, message };
}
```

## Cost Management

### Token Counting

```typescript
import { encoding_for_model } from 'js-tiktoken';

async function estimateCost(
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<{ tokens: number; cost: number }> {
  const encoding = encoding_for_model(model);
  
  let totalTokens = 0;
  for (const msg of messages) {
    totalTokens += encoding.encode(msg.content).length;
  }
  
  // Pricing (example for GPT-4 Turbo)
  const costPer1kTokens = 0.03; // Input tokens
  const cost = (totalTokens / 1000) * costPer1kTokens;
  
  return { tokens: totalTokens, cost };
}

// Use before making expensive calls
const { tokens, cost } = await estimateCost('gpt-4-turbo', messages);
if (cost > budgetLimit) {
  console.warn('[BUDGET_EXCEEDED]', { cost, budget: budgetLimit });
  return; // Skip expensive operation
}
```

### Response Caching

```typescript
// Cache LLM responses for identical inputs
const responseCache = new Map<string, { response: string; expiresAt: number }>();

async function cachedCompletion(
  key: string,
  buildPrompt: () => Promise<string>,
  ttlSeconds: number = 86400
): Promise<string> {
  // Check cache
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.response;
  }
  
  // Generate response
  const prompt = await buildPrompt();
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }],
  });
  
  const content = response.choices[0].message.content;
  
  // Cache result
  responseCache.set(key, {
    response: content,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  
  return content;
}
```

## Error Handling

### Graceful Degradation

```typescript
// ✓ Good: Fallback if LLM fails
async function generateSummary(content: string): Promise<string> {
  try {
    const summary = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Summarize: ${content}`,
        },
      ],
    });
    
    return summary.choices[0].message.content;
  } catch (error) {
    console.error('[LLM_ERROR]', { error: error.message });
    
    // Fallback: Use simple text truncation
    return content.substring(0, 200) + '...';
  }
}
```

### Rate Limiting for APIs

```typescript
import { RateLimiter } from 'limiter';

const openaiLimiter = new RateLimiter({
  tokensPerInterval: 90000, // 90k tokens per minute (GPT-4 limit)
  interval: 'minute',
});

async function rateLimitedCompletion(
  messages: any[]
): Promise<string> {
  // Wait for rate limit
  await openaiLimiter.removeTokens(1);
  
  return openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages,
  });
}
```

## Monitoring & Logging

```typescript
// Track LLM usage
async function logLLMUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number
): Promise<void> {
  await prisma.llmUsageLog.create({
    data: {
      model,
      inputTokens,
      outputTokens,
      cost,
      timestamp: new Date(),
    },
  });
  
  console.log('[LLM_USAGE]', {
    model,
    inputTokens,
    outputTokens,
    cost,
  });
}

// Monitor model performance
async function getModelStats(model: string): Promise<{
  totalCost: number;
  totalTokens: number;
  avgResponseTime: number;
}> {
  const logs = await prisma.llmUsageLog.findMany({
    where: { model },
  });
  
  return {
    totalCost: logs.reduce((s, l) => s + l.cost, 0),
    totalTokens: logs.reduce((s, l) => s + l.inputTokens + l.outputTokens, 0),
    avgResponseTime: 0, // Track separately
  };
}
```

## Anti-Patterns

**DO NOT**:
- Trust LLM outputs without validation
- Build prompts by concatenating user input directly
- Use high temperature when you need factual responses
- Forget to implement fallbacks for LLM failures
- Ignore token costs (can be expensive at scale)
- Cache responses indefinitely without re-validation
- Use LLMs for real-time critical systems without testing

**DO**:
- Ground responses in real data (RAG)
- Validate LLM outputs before using
- Use appropriate temperature (0 for facts, >0.5 for creativity)
- Implement rate limiting and error handling
- Monitor token usage and costs
- Cache expensive computations
- Use versioning for prompts (test changes carefully)
- Implement user feedback loop for model improvement
