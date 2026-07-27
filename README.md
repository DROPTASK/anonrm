# AnonRM - Anonymous Confessions Platform

A modern, privacy-first anonymous confessions and messaging platform built with React, TypeScript, and Supabase.

## Features

- 🔐 **Anonymous Confessions**: Share thoughts anonymously
- 💬 **Direct Messaging**: Send anonymous DMs
- 👥 **Group Confessions**: Create and join confession groups
- 🚀 **Fast & Responsive**: Built with Vite and optimized for performance
- 🌙 **Dark Mode**: Native dark mode support
- 📱 **Mobile First**: Fully responsive design

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Routing**: React Router v7
- **Deployment**: Ready for Vercel/Netlify

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- A Supabase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/DROPTASK/anonrm.git
cd anonrm
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Development

Start the development server:
```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Build

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
anonrm/
├── src/
│   ├── pages/           # Page components
│   │   ├── Feed.tsx     # Main feed
│   │   ├── Groups.tsx   # Groups page
│   │   ├── DMs.tsx      # Direct messages
│   │   ├── Profile.tsx  # User profile
│   │   ├── Login.tsx    # Authentication
│   │   ├── Ask.tsx      # Public question form
│   │   └── ...
│   ├── components/      # Reusable components
│   │   ├── ConfessionCard.tsx
│   │   ├── CommentList.tsx
│   │   ├── NewConfessionModal.tsx
│   │   └── ...
│   ├── utils/           # Utility functions
│   │   └── censor.ts    # Word censoring
│   ├── lib/             # Libraries
│   │   └── supabase.ts  # Supabase client
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML entry point
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
└── package.json         # Dependencies
```

## Configuration

### Tailwind CSS

Custom color scheme and utilities are configured in `tailwind.config.js`. Key colors:
- Primary: #09090b (dark background)
- Accent colors for voting and interactions

### TypeScript

Strict mode is enabled for better type safety. See `tsconfig.json` for full configuration.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Netlify

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables
5. Deploy

## Performance Optimizations

- Code splitting with Vite
- Lazy-loaded page components
- Skeleton loading states
- Optimized images with Dicebear avatars
- CSS-in-JS elimination (Tailwind)
- Minimal bundle size (~200KB gzipped)

## Security

- Environment variables for sensitive data
- CORS enabled for Supabase
- XSS protection with React
- SQL injection prevention via Supabase

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT

## Support

For issues or questions, please open a GitHub issue.

---

Made with ❤️ by DROPTASK
