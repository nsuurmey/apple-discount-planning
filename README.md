# 🍎 Apple Discount Planning Tool

A Monte Carlo simulation tool for analyzing apple discount scenarios and farm purchasing strategies. This interactive web application helps you explore different discount scenarios and make data-driven purchasing decisions.

## What Does This Tool Do?

The Apple Discount Planning Tool allows you to:

- **Define farm types** with different discount ranges (e.g., full price, small discount, medium discount, big discount)
- **Configure scenarios** with different market share distributions for each farm type
- **Run Monte Carlo simulations** to estimate potential savings based on your scenarios
- **Compare multiple scenarios** side-by-side to evaluate different strategies
- **Visualize results** with interactive charts showing savings distributions

The tool uses statistical simulation to account for uncertainty in:
- Number of farms you'll purchase from (random between min/max)
- Which farm types you'll encounter (based on market share probabilities)
- Actual discount received from each farm (random within the farm type's discount range)

## Live Demo

Visit the deployed app at: **https://nsuurmey.github.io/apple-discount-planning/**

## Quick Start

### Prerequisites

- Node.js 18+ and npm installed

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/nsuurmey/apple-discount-planning.git
   cd apple-discount-planning
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**

   The app will be running at `http://localhost:5173`

### Build for Production

To create a production build locally:

```bash
npm run build
```

The optimized files will be in the `dist/` directory.

To preview the production build:

```bash
npm run preview
```

## Deployment to GitHub Pages

### First-Time Setup

1. **Ensure you're on the correct branch**
   ```bash
   git checkout claude/deploy-github-pages-re9uv
   ```

2. **Install dependencies (if not already done)**
   ```bash
   npm install
   ```

3. **Deploy to GitHub Pages**
   ```bash
   npm run deploy
   ```

   This command will:
   - Build the production version of your app
   - Create/update the `gh-pages` branch
   - Push the built files to GitHub Pages

4. **Enable GitHub Pages** (first time only)
   - Go to your repository settings on GitHub
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select the `gh-pages` branch
   - Click "Save"
   - Your site will be live at `https://nsuurmey.github.io/apple-discount-planning/`

### Updating the Deployment

Whenever you make changes and want to update the live site:

1. **Make your changes** to the component or configuration
2. **Test locally**
   ```bash
   npm run dev
   ```
3. **Commit your changes**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin claude/deploy-github-pages-re9uv
   ```
4. **Deploy the updates**
   ```bash
   npm run deploy
   ```

The live site will be updated within a few minutes.

## Project Structure

```
apple-discount-planning/
├── index.html                 # Entry HTML file
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Vite configuration (includes GitHub Pages base path)
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── main.tsx             # React entry point
│   ├── App.tsx              # Main App component
│   └── index.css            # Global styles with Tailwind imports
├── original-plan/
│   └── apple-cost-simulator.tsx  # The main simulation component
└── public/
    └── apple.svg            # App icon
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Charting library for data visualization
- **gh-pages** - GitHub Pages deployment utility

## Component Features

The main component (`apple-cost-simulator.tsx`) includes:

- **Interactive inputs** for scenario parameters
- **Farm type editor** with customizable discount ranges and market shares
- **Monte Carlo simulation** with configurable trial counts (up to 200,000)
- **Statistical analysis** showing median, P10, P90, and probability distributions
- **Histogram visualization** of savings distributions
- **Scenario comparison** mode to evaluate multiple strategies
- **Scenario duplication** to easily create variants

## NPM Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to GitHub Pages

## Troubleshooting

### Build Errors

If you encounter build errors:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Try building with `npm run build`

### Deployment Issues

If deployment fails:
1. Make sure you have the latest changes committed
2. Verify the repository name matches in `vite.config.ts` (base path)
3. Check that GitHub Pages is enabled in repository settings
4. Try running `npm run deploy` again

### Development Server Issues

If the dev server won't start:
1. Make sure port 5173 is not in use
2. Try `npm run dev -- --port 3000` to use a different port

## License

MIT

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
