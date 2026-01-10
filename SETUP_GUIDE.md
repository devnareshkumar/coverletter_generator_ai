# Setup & Deployment Guide

## Prerequisites

- Node.js v18+ (https://nodejs.org)
- npm v9+
- Angular CLI v17: `npm install -g @angular/cli@17`

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
ng serve

# 3. Open browser
http://localhost:4200

# 4. Get API key from OpenAI/Claude/Gemini/Perplexity
# 5. Configure in app
# 6. Generate cover letters!
```

## Production Build

```bash
ng build --configuration production
# Output: dist/job-app-generator/
```

## Deployment

### GitHub Pages (Recommended)
```bash
npm run deploy
# Your site: https://YOUR_USERNAME.github.io/job-app-generator/
```

### Netlify
```bash
ng build --configuration production
# Drag dist/job-app-generator/ to Netlify.com
```

### Vercel
```bash
ng build --configuration production
npm install -g vercel
vercel --prod
```

## Troubleshooting

**"ng: command not found"**
```bash
npm install -g @angular/cli@17
```

**"Port 4200 already in use"**
```bash
ng serve --port 4201
```

**"npm install fails"**
```bash
npm install --legacy-peer-deps
```

## Security

- API keys stored in browser localStorage only
- Never commit API keys to Git
- Add API keys to .gitignore

## Support

See documentation files for complete guides.
