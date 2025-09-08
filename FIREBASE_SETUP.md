# Firebase Emulator Setup

This project uses Firebase emulators for local development. The configuration is in `firebase.json`.

## Emulator Ports

- **Authentication**: http://localhost:9099
- **Firestore**: http://localhost:8080
- **Functions**: http://localhost:5001
- **Emulator UI**: http://localhost:4000

## Quick Start

```bash
# Start all emulators
npm run dev:firebase

# Start specific emulators only
npx firebase emulators:start --only auth,firestore

# Run emulators for tests
npx firebase emulators:exec --project demo-project "npm test"
```

## Development Workflow

1. Start emulators: `npm run dev:firebase`
2. Access Emulator UI at http://localhost:4000
3. Run your Next.js app: `npm run dev`
4. Your app will connect to local emulators instead of production Firebase

## Configuration Files

- `firebase.json` - Main emulator configuration
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Database indexes

## Notes

- Emulators use demo project ID "demo-project" for local development
- Data is not persisted between emulator restarts
- Authentication tokens work only with the local emulator
