# ChronoPet

ChronoPet is a desktop pet for time management. It sits on your desktop, and you can interact with it to track your time and review your day.

## Features

- **Desktop Pet**: A floating pet that stays on top of other windows.
- **Quick Record**: Click the pet (Left Click) to quickly record what you are doing.
  - Supports pasting images (screenshots) directly.
  - "Capture Screen" button to auto-capture current screen.
  - "AI Summary" (mocked) to generate descriptions.
- **Dashboard**: Right Click the pet to open the Dashboard.
  - **Timeline**: View your daily timeline with screenshots.
  - **Stats**: See how many records you've made.
  - **Chat**: Discuss your day with ChronoPet (mocked AI interaction).
- **Data Persistence**: Records are saved to your local `userData` folder.

## Development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run in development mode:
   ```bash
   npm run dev
   ```
   (Note: Uses `concurrently` to run Vite and Electron together)

## Build

To build the executable:

```bash
npm run build
```

This will generate the installer/executable in `dist` or `release` folder (depending on configuration).

## Tech Stack

- **Electron**: For desktop capabilities (transparent windows, always on top, screen capture).
- **React**: For UI.
- **Vite**: For fast build tool.
- **Glassmorphism**: Custom CSS for modern look.
