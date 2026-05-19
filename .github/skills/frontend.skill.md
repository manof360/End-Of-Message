---
name: frontend-engineering
description: "Use when: building React components, implementing UI layouts, managing client-side state, optimizing rendering, ensuring accessibility"
---

# Frontend Engineering Skill

Specialist in React component development, Next.js App Router, performance optimization, and user experience.

## Core Responsibilities

- **Component Architecture**: Server/Client component split, prop drilling prevention, composition patterns
- **State Management**: React Context, hooks, form state with React Hook Form
- **Performance**: Code splitting, image optimization, memoization, lazy loading
- **Accessibility**: WCAG 2.1 AA compliance, semantic HTML, keyboard navigation
- **Responsive Design**: Mobile-first with Tailwind, fluid typography, touch-friendly interactions
- **Error Boundaries**: Graceful error display, user-friendly fallbacks

## Component Design Patterns

### Server vs Client Components

**Default to Server Components**:
```typescript
// app/dashboard/messages/page.tsx
// ✓ Server Component by default
import { Message, MessageCard } from '@/components/messages';
import { prisma } from '@/lib/prisma';

export default async function MessagesPage() {
  const messages = await prisma.message.findMany(); // Server-side data fetch
  
  return (
    <div>
      {messages.map(msg => <MessageCard key={msg.id} message={msg} />)}
    </div>
  );
}
```

**Use Client Components Only When Necessary**:
```typescript
// components/messages/MessageCard.tsx
'use client'; // Only if interactivity needed

import { useState } from 'react';

interface MessageCardProps {
  message: Message;
  onDelete?: (id: string) => Promise<void>;
}

export function MessageCard({ message, onDelete }: MessageCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  return (
    <div className="p-4 border rounded">
      <h3>{message.title}</h3>
      <p>{message.content}</p>
      
      <button
        onClick={async () => {
          setIsDeleting(true);
          await onDelete?.(message.id);
          setIsDeleting(false);
        }}
        disabled={isDeleting}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
```

### Props Design

```typescript
// ✓ Good: Single responsibility, composable
interface CardProps {
  title: string;
  description: string;
  variant?: 'default' | 'highlighted';
  onClick?: () => void;
}

function Card({ title, description, variant = 'default', onClick }: CardProps) {
  return (
    <div
      className={cn('p-4', variant === 'highlighted' && 'bg-blue-100')}
      onClick={onClick}
    >
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

// ✓ Usage is clear
<Card title="My Message" description="Test" variant="highlighted" />

// ✗ Bad: Too many props, unclear purpose
interface ComponentProps {
  data: any;
  onCallback?: Function;
  config?: Record<string, any>;
  isLoading?: boolean;
  // ... 20 more props
}
```

## State Management

### Context for Global State

```typescript
// app/providers/AuthContext.tsx
'use client';

import { createContext, useContext } from 'react';
import { Session } from 'next-auth';
import { useSession } from 'next-auth/react';

interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  
  return (
    <AuthContext.Provider
      value={{
        session: session ?? null,
        isLoading: status === 'loading',
        isAuthenticated: status === 'authenticated',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Usage
function Dashboard() {
  const { session, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return null;
  
  return <div>Welcome, {session?.user?.email}</div>;
}
```

### React Hook Form Integration

```typescript
// components/messages/CreateMessageForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

const createMessageSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  recipientIds: z.array(z.string()).min(1),
});

type FormData = z.infer<typeof createMessageSchema>;

export function CreateMessageForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createMessageSchema),
  });
  
  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      
      toast.success('Message created');
    } catch (error) {
      toast.error('Failed to create message');
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <input
          {...register('title')}
          placeholder="Title"
          className="w-full p-2 border rounded"
        />
        {errors.title && <p className="text-red-500">{errors.title.message}</p>}
      </div>
      
      <div>
        <textarea
          {...register('content')}
          placeholder="Content"
          className="w-full p-2 border rounded"
        />
        {errors.content && <p className="text-red-500">{errors.content.message}</p>}
      </div>
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {isSubmitting ? 'Creating...' : 'Create Message'}
      </button>
    </form>
  );
}
```

## Performance Optimization

### Code Splitting with Dynamic Imports

```typescript
// components/dashboard/page.tsx
import dynamic from 'next/dynamic';

// Heavy component loaded separately
const MessageScheduler = dynamic(
  () => import('@/components/messages/MessageScheduler'),
  { loading: () => <div>Loading scheduler...</div> }
);

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Suspense boundary for Scheduler */}
      <MessageScheduler />
    </div>
  );
}
```

### Image Optimization

```typescript
// ✗ Bad: Native HTML img
<img src="/profile-image.jpg" alt="Profile" />

// ✓ Good: Next.js Image component
import Image from 'next/image';

<Image
  src="/profile-image.jpg"
  alt="Profile"
  width={200}
  height={200}
  priority={false} // Lazy load by default
/>

// ✓ Responsive images
<Image
  src="/profile-image.jpg"
  alt="Profile"
  width={200}
  height={200}
  sizes="(max-width: 768px) 100px, (max-width: 1200px) 150px, 200px"
/>
```

### Memoization

```typescript
// Prevent unnecessary re-renders
import { memo } from 'react';

interface MessageItemProps {
  message: Message;
  onDelete: (id: string) => void;
}

export const MessageItem = memo(function MessageItem({
  message,
  onDelete,
}: MessageItemProps) {
  return (
    <div>
      <h4>{message.title}</h4>
      <button onClick={() => onDelete(message.id)}>Delete</button>
    </div>
  );
});

// Usage - only re-renders if message or onDelete changes
<MessageItem
  message={message}
  onDelete={handleDelete}
/>
```

## Accessibility (a11y)

### Semantic HTML

```typescript
// ✗ Bad: Non-semantic
<div onClick={handleClick} className="button">
  Click me
</div>

// ✓ Good: Semantic
<button onClick={handleClick} className="px-4 py-2 bg-blue-500 text-white rounded">
  Click me
</button>

// ✓ Semantic for form fields
<label htmlFor="title">Message Title</label>
<input id="title" type="text" placeholder="Enter title" />

// ✓ Semantic for navigation
<nav>
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/messages">Messages</a></li>
  </ul>
</nav>
```

### ARIA Labels

```typescript
// For interactive elements without visible label
<button aria-label="Close dialog" onClick={onClose}>
  ✕
</button>

// For live regions (status updates)
<div aria-live="polite" aria-label="Message status">
  {message.status}
</div>

// For form errors
<div>
  <input aria-describedby="title-error" placeholder="Title" />
  <span id="title-error" className="text-red-500">
    Title is required
  </span>
</div>
```

### Keyboard Navigation

```typescript
// ✓ Good: Keyboard accessible
export function Dialog({ children, onClose }: DialogProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <div
      role="dialog"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

## Responsive Design

### Mobile-First Tailwind

```typescript
// ✓ Good: Mobile-first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {messages.map(msg => <MessageCard key={msg.id} message={msg} />)}
</div>

// Breakdown:
// - grid-cols-1: 1 column on mobile
// - md:grid-cols-2: 2 columns on tablet (768px+)
// - lg:grid-cols-3: 3 columns on desktop (1024px+)
// - gap-4: Spacing between items
```

### Fluid Typography

```typescript
// ✓ Good: Scales with viewport
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Page Title
</h1>

// Or use CSS:
<h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}>
  Page Title
</h1>
```

## Error Handling

### Error Boundaries

```typescript
// components/ErrorBoundary.tsx
'use client';

import { ReactNode, Component } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error) {
    console.error('[ERROR_BOUNDARY]', error);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 border border-red-300 rounded">
          <h2 className="text-red-800">Something went wrong</h2>
          <p className="text-red-700">{this.state.error?.message}</p>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## Performance Monitoring

### Web Vitals

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
      <Analytics /> {/* Tracks Core Web Vitals */}
    </html>
  );
}
```

## Component Library Structure

```
src/components/
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── messages/
│   ├── MessageCard.tsx
│   ├── MessageList.tsx
│   └── CreateMessageForm.tsx
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   └── Toast.tsx
└── forms/
    ├── LoginForm.tsx
    └── SettingsForm.tsx
```

## Anti-Patterns

**DO NOT**:
- Use Client Components by default (use Server Components)
- Prop drilling (use Context for cross-cutting state)
- Inline heavy computations in render
- Forget alt text on images
- Use non-semantic HTML for functionality
- Mix styling approaches in one file
- Store auth tokens in Client Component state
- Forget error boundaries

**DO**:
- Keep components small and focused
- Memoize expensive components
- Use responsive design by default
- Test accessibility with keyboard navigation
- Optimize images with Next.js Image
- Use Server Components for data fetching
- Implement loading/error states
- Validate all user input
