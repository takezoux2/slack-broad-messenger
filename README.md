# Slack Broad Messenger

A powerful web application that enables you to send messages to multiple Slack channels simultaneously. Built with modern web technologies for scalability and performance.

**Tech Stack**: TypeScript + Next.js 15+ + React 18+ + Firebase + Slack SDK + Vitest + Playwright

## Features

- 🚀 **Multi-Channel Messaging**: Send messages to multiple Slack channels at once
- 🔐 **Slack OAuth Integration**: Secure authentication with Slack workspaces
- 📋 **Channel List Management**: Create and manage lists of frequently used channels
- 📊 **Delivery Tracking**: Monitor message delivery status across channels
- ⚡ **Performance Optimized**: Smart caching and batch processing for large channel lists
- 🎯 **User-Friendly Interface**: Intuitive React components for easy interaction
- 🧪 **Comprehensive Testing**: Unit, integration, contract, and E2E test coverage

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled
- Slack app with appropriate OAuth permissions

### 1. Installation

```bash
git clone <repository-url>
cd slack-broad-messenger
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Slack Configuration
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_REDIRECT_URI=http://localhost:3000/api/auth/slack/callback

# Development
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
```

### 3. Firebase Setup

Follow the detailed setup instructions in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).

For development with emulators:

```bash
# Start Firebase emulators
npm run dev:firebase

# In another terminal, start the development server
npm run dev
```

### 4. Slack App Configuration

1. Create a Slack app at [api.slack.com](https://api.slack.com/apps)
2. Configure OAuth & Permissions with required scopes:
   - `channels:read`
   - `groups:read`
   - `users:read`
   - `chat:write`
   - `chat:write.public`
3. Set redirect URL to `http://localhost:3000/api/auth/slack/callback`
4. Install the app to your workspace

## Development

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:firebase     # Start Firebase emulators
npm run build           # Build for production
npm run start           # Start production server

# Testing
npm test                # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run test:contract   # Contract tests only
npm run test:e2e        # End-to-end tests only
npm run test:watch      # Watch mode for development

# Code Quality
npm run lint            # ESLint and Biome linting
npm run lint:fix        # Fix auto-fixable lint issues
npm run format          # Format code with Biome
npm run type-check      # TypeScript type checking
```

## Usage Guide

### 1. Authentication

1. Navigate to the application
2. Click "Sign in with Slack"
3. Authorize the application in your Slack workspace
4. You'll be redirected back to the application

### 2. Creating Channel Lists

1. Go to the Channel Lists page
2. Click "Create New List"
3. Enter a name and description
4. Select channels from your Slack workspace
5. Save the list for future use

### 3. Sending Messages

1. Select a channel list from the dropdown
2. Compose your message in the text area
3. Preview the recipient channels
4. Click "Send Message"
5. Monitor delivery status in real-time

### 4. Managing Delivery Reports

- View delivery status for each channel
- Retry failed deliveries
- Export delivery reports for analysis

## Architecture

### Frontend (Next.js + React)

- **Pages**: Next.js 15 App Router for routing
- **Components**: Reusable React components in `src/components/`
- **State Management**: React hooks and context providers
- **Styling**: Tailwind CSS for responsive design

### Backend (Next.js API Routes)

- **Authentication**: Firebase Auth with Slack OAuth integration
- **API Routes**: RESTful endpoints in `src/pages/api/`
- **Data Layer**: Firebase Firestore for persistence
- **External APIs**: Slack Web API for channel and user data

### Data Flow

1. User authenticates via Slack OAuth
2. Channel and user data fetched from Slack API
3. Channel lists stored in Firestore
4. Messages sent via Slack API with delivery tracking
5. Performance optimized with intelligent caching

## API Documentation

For detailed API documentation, see [docs/api.md](./docs/api.md).

### Key Endpoints

- `GET /api/auth/slack` - Initiate Slack OAuth
- `GET /api/auth/slack/callback` - OAuth callback handler
- `GET /api/channels` - List Slack channels
- `GET /api/slack-users` - List Slack users
- `POST /api/channel-lists` - Create channel list
- `GET /api/channel-lists` - Get user's channel lists
- `POST /api/messages` - Send message to channels
- `GET /api/messages/deliveries` - Get delivery reports

## Testing

### Test Structure

```
tests/
├── unit/              # Unit tests for individual functions
├── integration/       # Integration tests for API endpoints
├── contract/          # Contract tests for API compliance
└── e2e/              # End-to-end browser tests
```

### Running Tests

```bash
# Development testing with watch mode
npm run test:watch

# Continuous Integration
npm test

# Test coverage report
npm run test:coverage

# E2E tests (requires development server)
npm run dev &
npm run test:e2e
```

## Performance Features

- **Intelligent Caching**: Multi-level caching strategy for API responses
- **Batch Processing**: Efficient handling of large channel lists
- **Pagination**: Virtual scrolling for large datasets
- **Rate Limiting**: Built-in rate limiting for Slack API calls
- **Background Sync**: Automatic data synchronization
- **Stale-While-Revalidate**: Serve cached data while fetching updates

## Configuration

### Cache Settings

Cache TTL (Time To Live) values can be configured:

- Static data: 1 hour
- Dynamic data: 5 minutes
- Real-time data: 30 seconds

### Rate Limiting

Default rate limits:

- Slack API calls: 50 requests per minute
- Channel operations: 10 requests per second
- Message sending: 1 message per second per channel

## Deployment

### Production Build

```bash
npm run build
npm run start
```

### Environment Variables for Production

Ensure all environment variables are properly set in your production environment:

```bash
# Required for production
SLACK_CLIENT_SECRET=your-production-secret
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-production-project
# ... other production values
```

### Deploy on Vercel

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

For other deployment options, see [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Maintain test coverage above 80%
- Use conventional commit messages
- Run `npm run lint` before committing
- Update documentation for new features

## Security

- OAuth tokens are stored securely in Firebase
- Rate limiting prevents API abuse
- Input validation on all endpoints
- CORS properly configured
- Environment variables for sensitive data

## Troubleshooting

### Common Issues

**Authentication failing:**

- Verify Slack app configuration
- Check redirect URL matches exactly
- Ensure required OAuth scopes are granted

**Firebase connection issues:**

- Verify Firebase configuration
- Check network connectivity
- Ensure emulators are running in development

**Slack API errors:**

- Check rate limiting
- Verify bot permissions in channels
- Ensure workspace hasn't revoked app access

### Support

For support and bug reports, please create an issue in the repository with:

- Environment details (Node.js version, OS)
- Steps to reproduce the issue
- Expected vs actual behavior
- Relevant error messages

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Firebase](https://firebase.google.com/)
- Slack integration via [Slack SDK](https://slack.dev/)
- Testing with [Vitest](https://vitest.dev/) and [Playwright](https://playwright.dev/)
