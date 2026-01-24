# PRD: Slop Feed

## Introduction

Slop Feed is a mobile application that democratizes app development by allowing anyone to create and share AI-generated "vibe coded" applications. Users describe the app they want in natural language, and a Claude Opus 4.5-powered agent pipeline generates, deploys, and hosts the application automatically on Daytona containers.

The platform combines three goals equally:
1. **Democratize development** - Enable non-developers to create functional web applications
2. **Build community** - Create an Instagram-style social feed where users discover and share AI-generated apps
3. **Showcase vibe coding** - Demonstrate the capabilities of AI-assisted development

---

## Goals

- Allow users to generate any frontend application from a natural language prompt
- Deploy generated apps to live URLs instantly via Daytona containers
- Provide a social feed for discovering, liking, and sharing community-created apps
- Support both email/password and social authentication (Google, GitHub, Apple)
- Filter inappropriate prompts before generation to ensure platform safety
- Keep all generated apps live indefinitely (no auto-deletion)
- Deliver real-time generation progress updates via WebSocket

---

## User Stories

### Epic 1: Authentication

#### US-001: User registration with email/password
**Description:** As a new user, I want to create an account with my email and password so that I can save my generated apps.

**Acceptance Criteria:**
- [ ] Registration form with email, password, confirm password, and username fields
- [ ] Email validation (valid format, not already registered)
- [ ] Password requirements: minimum 8 characters
- [ ] Username requirements: 3-20 characters, alphanumeric and underscores only
- [ ] Email verification sent on registration
- [ ] User redirected to main feed after successful registration
- [ ] Error messages displayed for validation failures

#### US-002: User registration with social login
**Description:** As a new user, I want to sign up using my Google, GitHub, or Apple account so that I can get started quickly.

**Acceptance Criteria:**
- [ ] Google OAuth login button functional
- [ ] GitHub OAuth login button functional
- [ ] Apple Sign-In button functional (iOS)
- [ ] Username auto-generated from social profile (editable)
- [ ] Avatar pulled from social profile
- [ ] User redirected to main feed after successful registration

#### US-003: User login
**Description:** As a returning user, I want to log in to access my apps and the feed.

**Acceptance Criteria:**
- [ ] Login form with email and password fields
- [ ] Social login buttons (Google, GitHub, Apple)
- [ ] "Forgot password" link triggers password reset email
- [ ] "Remember me" option persists session
- [ ] Error message for invalid credentials
- [ ] Redirect to main feed on successful login

#### US-004: User logout
**Description:** As a logged-in user, I want to log out to secure my account.

**Acceptance Criteria:**
- [ ] Logout option in profile screen
- [ ] Clears local session and tokens
- [ ] Redirects to login screen

---

### Epic 2: Main Feed

#### US-005: View app feed
**Description:** As a user, I want to browse a feed of community-created apps so that I can discover interesting creations.

**Acceptance Criteria:**
- [ ] Vertical scrolling feed (Instagram-style)
- [ ] Each feed item displays: thumbnail, app title, creator username, creator avatar, like count, time ago
- [ ] Infinite scroll with pagination (load more on scroll)
- [ ] Pull-to-refresh functionality
- [ ] Feed sorted by recency (newest first) by default
- [ ] Loading skeleton shown while fetching
- [ ] Empty state message if no apps exist

#### US-006: Like an app
**Description:** As a user, I want to like apps I enjoy so that I can show appreciation and save them for later.

**Acceptance Criteria:**
- [ ] Heart icon on each feed item
- [ ] Tap to toggle like (filled = liked, outline = not liked)
- [ ] Like count updates immediately (optimistic update)
- [ ] Liked apps appear in user's profile under "Favorites"
- [ ] Cannot like own apps (heart icon hidden or disabled)

#### US-007: View app details
**Description:** As a user, I want to tap on a feed item to see the full app and interact with it.

**Acceptance Criteria:**
- [ ] Tapping feed item opens full-screen app detail view
- [ ] WebView displays the live deployed app
- [ ] App title, creator info, and description visible above WebView
- [ ] Like button accessible from detail view
- [ ] Share button to share app URL via native share sheet
- [ ] "Open in browser" option to view in external browser
- [ ] Back button returns to feed (maintains scroll position)

#### US-008: View app comments
**Description:** As a user, I want to read and write comments on apps to engage with the community.

**Acceptance Criteria:**
- [ ] Comments section below app WebView in detail view
- [ ] Comments display: username, avatar, comment text, time ago
- [ ] Text input to add new comment
- [ ] Comments sorted by recency (newest first)
- [ ] Maximum comment length: 500 characters
- [ ] Empty state: "No comments yet. Be the first!"

---

### Epic 3: Create/Preview Screen

#### US-009: Enter app prompt (IDLE state)
**Description:** As a user, I want to describe the app I want to create so that the AI can generate it for me.

**Acceptance Criteria:**
- [ ] Large text input area with placeholder: "Describe the app you want to create..."
- [ ] Character count indicator (recommended max: 1000 characters)
- [ ] "Generate" button disabled when input is empty
- [ ] "Generate" button enabled when input has content
- [ ] Optional: example prompts shown as inspiration chips
- [ ] Keyboard dismisses when tapping outside input

#### US-010: Prompt content filtering
**Description:** As a platform operator, I want to filter inappropriate prompts before generation to maintain platform safety.

**Acceptance Criteria:**
- [ ] Prompt sent to moderation check before generation starts
- [ ] Blocked categories: explicit content, hate speech, illegal activities, malware/hacking tools
- [ ] If blocked: display friendly error message explaining the prompt was rejected
- [ ] If blocked: user can edit prompt and retry
- [ ] Moderation response time < 2 seconds

#### US-011: View generation progress (GENERATING state)
**Description:** As a user, I want to see real-time progress while my app is being generated so I know it's working.

**Acceptance Criteria:**
- [ ] Prompt input collapses to a preview bar showing truncated prompt
- [ ] Progress bar shows percentage complete (0-100%)
- [ ] Step indicators with statuses:
  - [ ] "Analyzing prompt..." (pending/active/complete)
  - [ ] "Selecting tech stack..." (pending/active/complete)
  - [ ] "Generating code..." (pending/active/complete)
  - [ ] "Deploying to cloud..." (pending/active/complete)
  - [ ] "Going live!" (pending/active/complete)
- [ ] Current step shows spinner animation
- [ ] Completed steps show checkmark
- [ ] Cancel button aborts generation and returns to IDLE (prompt preserved)
- [ ] Progress updates received via WebSocket in real-time

#### US-012: View generated app (LIVE state)
**Description:** As a user, I want to see and interact with my generated app immediately after creation.

**Acceptance Criteria:**
- [ ] WebView displays the live deployed app at full width
- [ ] App is fully interactive within WebView
- [ ] App URL displayed below WebView (tappable to copy)
- [ ] Three action buttons visible:
  - [ ] "Share" - opens native share sheet with app URL
  - [ ] "Post to Feed" - publishes app to community feed
  - [ ] "New" - clears state and returns to IDLE
- [ ] Prompt still visible in collapsed bar (expandable)

#### US-013: Post app to feed
**Description:** As a user, I want to publish my generated app to the community feed so others can discover it.

**Acceptance Criteria:**
- [ ] "Post to Feed" button triggers publish flow
- [ ] Modal prompts for app title (auto-suggested from prompt)
- [ ] Modal prompts for optional description
- [ ] Confirm button publishes app
- [ ] Success toast: "App posted to feed!"
- [ ] User redirected to feed with their app at top
- [ ] App thumbnail auto-generated (screenshot of deployed app)

#### US-014: Handle generation failure
**Description:** As a user, I want to understand what went wrong if generation fails so I can try again.

**Acceptance Criteria:**
- [ ] Error state displays clear error message
- [ ] Common errors: timeout, deployment failure, invalid prompt
- [ ] "Try Again" button retries with same prompt
- [ ] "Edit Prompt" button returns to IDLE with prompt preserved
- [ ] Error details collapsible for technical users

---

### Epic 4: Profile Screen

#### US-015: View own profile
**Description:** As a user, I want to see my profile with my created apps and account information.

**Acceptance Criteria:**
- [ ] Profile header: avatar, username, join date
- [ ] Stats: total apps created, total likes received
- [ ] "My Apps" tab showing grid of user's created apps
- [ ] "Favorites" tab showing grid of liked apps
- [ ] Tapping an app opens app detail view
- [ ] Settings gear icon in header

#### US-016: Edit profile
**Description:** As a user, I want to update my profile information.

**Acceptance Criteria:**
- [ ] Edit button opens profile edit screen
- [ ] Editable fields: username, avatar (upload or select)
- [ ] Save button persists changes
- [ ] Cancel button discards changes
- [ ] Validation: username uniqueness checked

#### US-017: View settings
**Description:** As a user, I want to access app settings and account options.

**Acceptance Criteria:**
- [ ] Settings screen accessible from profile
- [ ] Options include:
  - [ ] Notification preferences
  - [ ] Change password (email/password users only)
  - [ ] Linked accounts (view connected social logins)
  - [ ] Privacy policy link
  - [ ] Terms of service link
  - [ ] App version display
  - [ ] Logout button
  - [ ] Delete account option

#### US-018: Delete account
**Description:** As a user, I want to delete my account and all associated data.

**Acceptance Criteria:**
- [ ] Delete account option in settings
- [ ] Confirmation dialog with warning about permanent deletion
- [ ] Requires password or re-authentication
- [ ] Deletes: user record, all created apps, all likes, all comments
- [ ] Daytona workspaces for user's apps are destroyed
- [ ] User logged out and redirected to login screen

---

### Epic 5: Backend - API Layer

#### US-019: REST API endpoints
**Description:** As a frontend developer, I need API endpoints to perform all app operations.

**Acceptance Criteria:**
- [ ] `POST /auth/register` - Email registration
- [ ] `POST /auth/login` - Email login
- [ ] `POST /auth/social/{provider}` - Social login (google/github/apple)
- [ ] `POST /auth/logout` - Logout
- [ ] `POST /auth/forgot-password` - Request password reset
- [ ] `GET /users/me` - Get current user profile
- [ ] `PATCH /users/me` - Update current user profile
- [ ] `DELETE /users/me` - Delete account
- [ ] `GET /apps` - List apps (paginated feed)
- [ ] `GET /apps/{id}` - Get single app details
- [ ] `POST /apps` - Create new app (start generation)
- [ ] `DELETE /apps/{id}` - Delete own app
- [ ] `POST /apps/{id}/publish` - Publish app to feed
- [ ] `POST /apps/{id}/like` - Like an app
- [ ] `DELETE /apps/{id}/like` - Unlike an app
- [ ] `GET /apps/{id}/comments` - Get app comments
- [ ] `POST /apps/{id}/comments` - Add comment
- [ ] `GET /users/{id}` - Get user public profile
- [ ] `GET /users/{id}/apps` - Get user's public apps
- [ ] All endpoints return consistent JSON structure
- [ ] All endpoints have proper error responses (400, 401, 403, 404, 500)

#### US-020: WebSocket connection for generation updates
**Description:** As a frontend developer, I need real-time updates during app generation.

**Acceptance Criteria:**
- [ ] WebSocket endpoint: `ws://api/ws/generation/{job_id}`
- [ ] Authentication via token in connection params
- [ ] Message types:
  - [ ] `status_update`: { step, percent, message }
  - [ ] `completed`: { app_id, live_url, thumbnail_url }
  - [ ] `failed`: { error_code, error_message }
- [ ] Connection auto-closes on completion or failure
- [ ] Heartbeat ping every 30 seconds to keep connection alive

#### US-021: Rate limiting
**Description:** As a platform operator, I need to prevent abuse through rate limiting.

**Acceptance Criteria:**
- [ ] App generation: max 10 per hour per user
- [ ] API requests: max 100 per minute per user
- [ ] Comments: max 20 per hour per user
- [ ] Rate limit headers returned: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- [ ] 429 Too Many Requests response when exceeded

---

### Epic 6: Backend - Agent Pipeline

#### US-022: Prompt Analyzer Agent
**Description:** As a system, I need to analyze user prompts to determine the best approach for generation.

**Acceptance Criteria:**
- [ ] Receives raw user prompt
- [ ] Extracts intent (app type: game, tool, landing page, dashboard, etc.)
- [ ] Determines appropriate tech stack (React, vanilla JS, HTML/CSS, Canvas)
- [ ] Estimates complexity (simple, medium, complex)
- [ ] Identifies key features to implement
- [ ] Outputs structured analysis for Code Generator Agent
- [ ] Runs as Claude Opus 4.5 agent via Claude Agents SDK
- [ ] Completes in < 10 seconds

#### US-023: Code Generator Agent
**Description:** As a system, I need to generate complete, working application code from the analysis.

**Acceptance Criteria:**
- [ ] Receives structured analysis from Prompt Analyzer
- [ ] Generates complete application code:
  - [ ] index.html (entry point)
  - [ ] styles.css (if needed)
  - [ ] app.js / main component files
  - [ ] package.json (if using npm packages)
- [ ] Code is self-contained and deployable
- [ ] Code follows best practices for chosen tech stack
- [ ] Includes error handling for common edge cases
- [ ] Runs as Claude Opus 4.5 agent via Claude Agents SDK
- [ ] Reports progress via callback for WebSocket updates
- [ ] Completes in < 60 seconds for simple apps, < 120 seconds for complex

#### US-024: Deploy Manager Agent
**Description:** As a system, I need to deploy generated code to Daytona containers and return a live URL.

**Acceptance Criteria:**
- [ ] Receives generated code from Code Generator
- [ ] Creates new Daytona workspace via Daytona API
- [ ] Pushes code files to workspace
- [ ] Triggers build/start process
- [ ] Waits for healthy status (with timeout)
- [ ] Returns live public URL
- [ ] Handles deployment failures gracefully
- [ ] Runs as Claude Opus 4.5 agent via Claude Agents SDK
- [ ] Reports progress via callback for WebSocket updates
- [ ] Completes in < 60 seconds

#### US-025: Screenshot service
**Description:** As a system, I need to capture thumbnails of deployed apps for the feed.

**Acceptance Criteria:**
- [ ] Triggered after successful deployment
- [ ] Loads app URL in headless browser
- [ ] Waits for page load (max 10 seconds)
- [ ] Captures viewport screenshot (1200x630 for social sharing aspect ratio)
- [ ] Generates thumbnail (400x210)
- [ ] Uploads to Supabase Storage
- [ ] Returns public URLs for screenshot and thumbnail
- [ ] Handles failures gracefully (use placeholder image)

---

### Epic 7: Backend - Job Queue

#### US-026: Async job processing
**Description:** As a system, I need to process generation requests asynchronously to handle long-running tasks.

**Acceptance Criteria:**
- [ ] Redis-backed job queue (Celery or ARQ)
- [ ] Jobs created when user submits prompt
- [ ] Job states: pending, processing, completed, failed
- [ ] Job data includes: user_id, prompt, app_id, created_at
- [ ] Workers process jobs sequentially (one generation at a time per worker)
- [ ] Horizontal scaling: multiple workers can run simultaneously
- [ ] Job timeout: 5 minutes max
- [ ] Failed jobs stored with error details for debugging

#### US-027: Job status persistence
**Description:** As a system, I need to persist job status so users can reconnect and see progress.

**Acceptance Criteria:**
- [ ] Job status stored in Redis with TTL (1 hour after completion)
- [ ] Status includes: current step, percent, timestamps
- [ ] User can disconnect and reconnect to WebSocket without losing progress
- [ ] On reconnect, current status sent immediately

---

### Epic 8: Database & Storage

#### US-028: Database schema setup
**Description:** As a developer, I need the database schema created in Supabase.

**Acceptance Criteria:**
- [ ] `users` table:
  - [ ] id (uuid, primary key)
  - [ ] email (text, unique, not null)
  - [ ] username (text, unique, not null)
  - [ ] avatar_url (text, nullable)
  - [ ] created_at (timestamp)
  - [ ] updated_at (timestamp)
- [ ] `apps` table:
  - [ ] id (uuid, primary key)
  - [ ] user_id (uuid, foreign key to users)
  - [ ] prompt (text, not null)
  - [ ] title (text, nullable)
  - [ ] description (text, nullable)
  - [ ] thumbnail_url (text, nullable)
  - [ ] screenshot_url (text, nullable)
  - [ ] live_url (text, nullable)
  - [ ] source_code (jsonb, nullable) - stored generated code
  - [ ] daytona_workspace_id (text, nullable)
  - [ ] status (enum: pending, analyzing, generating, deploying, live, failed)
  - [ ] is_published (boolean, default false)
  - [ ] likes_count (integer, default 0)
  - [ ] views_count (integer, default 0)
  - [ ] created_at (timestamp)
  - [ ] updated_at (timestamp)
- [ ] `likes` table:
  - [ ] user_id (uuid, foreign key)
  - [ ] app_id (uuid, foreign key)
  - [ ] created_at (timestamp)
  - [ ] Primary key: (user_id, app_id)
- [ ] `comments` table:
  - [ ] id (uuid, primary key)
  - [ ] user_id (uuid, foreign key)
  - [ ] app_id (uuid, foreign key)
  - [ ] content (text, not null, max 500 chars)
  - [ ] created_at (timestamp)
- [ ] Indexes on: apps.user_id, apps.is_published, apps.created_at, likes.app_id, comments.app_id
- [ ] Row-level security policies configured

#### US-029: File storage setup
**Description:** As a developer, I need Supabase Storage buckets configured for media.

**Acceptance Criteria:**
- [ ] `avatars` bucket - public, for user avatars
- [ ] `thumbnails` bucket - public, for app thumbnails
- [ ] `screenshots` bucket - public, for full app screenshots
- [ ] File size limits: avatars 2MB, thumbnails 1MB, screenshots 5MB
- [ ] Allowed formats: jpg, png, webp

---

## Functional Requirements

### Authentication
- FR-1: Users can register with email/password or social login (Google, GitHub, Apple)
- FR-2: Email verification required for email/password registration
- FR-3: Password reset flow via email for email/password users
- FR-4: Session tokens expire after 7 days of inactivity
- FR-5: Users can link multiple social accounts to one profile

### Feed
- FR-6: Feed displays only published apps (is_published = true)
- FR-7: Feed paginates with 20 apps per page
- FR-8: Feed items show thumbnail, title, creator, likes, and timestamp
- FR-9: Users can like/unlike any app except their own
- FR-10: Like counts update in real-time via optimistic updates

### App Creation
- FR-11: Prompt must be 1-1000 characters
- FR-12: Prompt is filtered for inappropriate content before generation starts
- FR-13: Generation progress updates sent via WebSocket every 2-5 seconds
- FR-14: Users can cancel generation at any time
- FR-15: Generated apps are private until explicitly published
- FR-16: Published apps receive auto-generated title if user doesn't provide one

### App Lifecycle
- FR-17: Apps remain live indefinitely (no auto-deletion)
- FR-18: Users can delete their own apps at any time
- FR-19: Deleting an app destroys the associated Daytona workspace
- FR-20: Account deletion cascades to all user's apps, likes, and comments

### Profile
- FR-21: Users can view their created apps and favorited apps
- FR-22: Users can edit username and avatar
- FR-23: Usernames must be unique (case-insensitive)

### Comments
- FR-24: Comments limited to 500 characters
- FR-25: Users can comment on any published app
- FR-26: Comment authors can delete their own comments

---

## Non-Goals (Out of Scope)

- **No app editing**: Users cannot modify generated apps; they must create new ones
- **No collaboration**: Apps are single-owner, no sharing or co-creation
- **No version history**: No tracking of prompt iterations or code versions
- **No custom domains**: Apps only accessible via Daytona-generated URLs
- **No monetization**: No payments, subscriptions, or premium features in v1
- **No app analytics**: No tracking of views or usage stats for individual apps
- **No following/followers**: No social graph; feed is global, not personalized
- **No search**: No ability to search apps by keyword (v1 is browse-only)
- **No notifications**: No push notifications for likes, comments, etc.
- **No post-generation moderation**: Only pre-generation prompt filtering (per requirement)

---

## Design Considerations

### Navigation Structure
- Bottom tab bar with 3 tabs: Feed, Create, Profile
- Tab icons: Home (feed), Plus/Sparkle (create), Person (profile)

### Color Palette (Suggested)
- Primary: Electric purple (#8B5CF6)
- Secondary: Cyan accent (#06B6D4)
- Background: Dark (#0F0F0F)
- Surface: Dark gray (#1A1A1A)
- Text: White (#FFFFFF) / Gray (#9CA3AF)

### Typography
- Headings: Bold, sans-serif
- Body: Regular weight, high readability
- Monospace for URLs and code references

### Animations
- Smooth transitions between Create screen states
- Progress bar animations during generation
- Heart animation on like
- Pull-to-refresh spinner

### Responsive Behavior
- Optimized for mobile (portrait)
- WebView scales to fit screen width
- App thumbnails maintain 16:9 aspect ratio

---

## Technical Considerations

### Frontend
- **Framework**: React Native with Expo (managed workflow)
- **State Management**: Zustand for global state, React Query for server state
- **Navigation**: Expo Router (file-based routing)
- **Auth**: Supabase Auth SDK
- **WebSocket**: Native WebSocket API or socket.io-client
- **WebView**: react-native-webview for app previews

### Backend
- **Framework**: Python FastAPI
- **Agent SDK**: Claude Agents SDK with Opus 4.5
- **Queue**: Redis + ARQ (or Celery)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Screenshot**: Playwright or Puppeteer in headless mode

### Infrastructure
- **App Hosting**: Daytona containers (one workspace per app)
- **Backend Hosting**: Railway, Render, or Fly.io
- **Database**: Supabase managed PostgreSQL
- **Redis**: Upstash Redis or Railway Redis

### API Design
- RESTful JSON API
- JWT authentication via Authorization header
- Consistent error response format: `{ error: { code, message, details } }`
- API versioning via URL prefix: `/api/v1/`

### Security
- HTTPS only
- JWT tokens with short expiry (15 min) + refresh tokens (7 days)
- Rate limiting on all endpoints
- Input sanitization on all user inputs
- Prompt filtering before AI generation
- Row-level security on database tables

---

## Success Metrics

- **Generation success rate**: > 90% of prompts result in a live, functional app
- **Generation time**: < 3 minutes from prompt submission to live URL
- **Feed engagement**: Average user views > 10 apps per session
- **Creation rate**: > 30% of users create at least one app
- **Publishing rate**: > 50% of generated apps are published to feed
- **Error rate**: < 1% of API requests result in 5xx errors

---

## Open Questions

1. **Daytona workspace limits**: Are there limits on concurrent workspaces or total workspaces per account? What's the cost model?

2. **Prompt filtering service**: Should we use Claude for moderation, or a dedicated service like OpenAI Moderation API or Perspective API?

3. **App complexity limits**: Should we set guardrails on app complexity (e.g., max files, max lines of code) to ensure reasonable generation times?

4. **Source code visibility**: Should users be able to view/download the generated source code, or is it hidden?

5. **Offline support**: Should the app have any offline functionality (cached feed, etc.)?

6. **Deep linking**: Should apps have shareable deep links that open directly in the Slop Feed app?

7. **Web version**: Is a web version planned for v2, or is this mobile-only indefinitely?

---

## Appendix: Generation Pipeline Detail

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GENERATION PIPELINE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. USER SUBMITS PROMPT                                             │
│     └─> POST /apps { prompt: "..." }                                │
│     └─> Returns { app_id, job_id }                                  │
│     └─> Status: pending                                             │
│                                                                     │
│  2. MODERATION CHECK                                                │
│     └─> Prompt sent to content filter                               │
│     └─> If blocked: Status → failed, return error                   │
│     └─> If passed: Continue                                         │
│     └─> WebSocket: { step: "moderation", status: "complete" }       │
│                                                                     │
│  3. PROMPT ANALYZER AGENT                                           │
│     └─> Claude Opus 4.5 analyzes prompt                             │
│     └─> Output: { intent, tech_stack, features[], complexity }      │
│     └─> Status: analyzing                                           │
│     └─> WebSocket: { step: "analyzing", percent: 20 }               │
│                                                                     │
│  4. CODE GENERATOR AGENT                                            │
│     └─> Claude Opus 4.5 generates code                              │
│     └─> Output: { files: [{ name, content }] }                      │
│     └─> Status: generating                                          │
│     └─> WebSocket: { step: "generating", percent: 40-70 }           │
│                                                                     │
│  5. DEPLOY MANAGER AGENT                                            │
│     └─> Creates Daytona workspace                                   │
│     └─> Pushes code files                                           │
│     └─> Triggers build                                              │
│     └─> Waits for healthy status                                    │
│     └─> Output: { workspace_id, live_url }                          │
│     └─> Status: deploying                                           │
│     └─> WebSocket: { step: "deploying", percent: 70-90 }            │
│                                                                     │
│  6. SCREENSHOT CAPTURE                                              │
│     └─> Headless browser loads live_url                             │
│     └─> Captures screenshot                                         │
│     └─> Generates thumbnail                                         │
│     └─> Uploads to Supabase Storage                                 │
│     └─> Output: { screenshot_url, thumbnail_url }                   │
│     └─> WebSocket: { step: "finalizing", percent: 95 }              │
│                                                                     │
│  7. COMPLETION                                                      │
│     └─> App record updated with all URLs                            │
│     └─> Status: live                                                │
│     └─> WebSocket: { type: "completed", app: {...} }                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
