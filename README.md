# holdorsell - A Rent vs Sell Calculator

A client-side tool to compare the financial outcomes of renting your property vs selling it today.

**Live Demo**: [jake-kelley.github.io/hold-or-sell](https://jake-kelley.github.io/hold-or-sell)

## Quick Start

Open `index.html` in your browser, or visit the live demo above. No build step or server required.

## Features

- **Instant Recalculation**: All values update as you type (debounced for performance)
- **Accurate Amortization**: Standard formula for loan balance at any point in time
- **Capital Gains Tax**: Handles primary residence exemption ($500k MFJ cap) for first 3 years
- **Cost Inflation**: Property taxes, insurance, HOA, and maintenance inflate annually while P&I stays fixed
- **Visual Chart**: Compare scenarios over time with Chart.js
- **Responsive Layout**: Two-column desktop view with summary sidebar; stacks on mobile
- **Mobile Tooltips**: Tap any input to see help text (since hover doesn't work on touch)
- **URL Persistence**: Bookmark or share your exact scenario via URL parameters
- **Input Validation**: Values are silently clamped to sensible ranges

## Inputs

| Input | Description |
|-------|-------------|
| Original Purchase Price | What you paid (basis for capital gains) |
| Current Est. Home Value | Today's market value (Year 0 basis) |
| Loan Origination Date | When the mortgage started |
| Original Loan Amount | Initial loan principal |
| Interest Rate | Annual mortgage interest rate |
| Mortgage Term | 15, 20, or 30 years |
| Primary Residence | Have you lived here 2 of last 5 years? |
| Years to Hold | How many years to analyze |
| HOA | Monthly homeowners association fee |
| Property Taxes | Monthly property taxes |
| Home Insurance | Monthly insurance premium |
| Maintenance Reserve | Monthly reserve for repairs |
| Monthly Rent | Expected rental income |
| Annual Rent Increase | Expected yearly rent growth % |
| Property Mgmt Fee | % of rent for property manager |
| Tax Rate on Income | Your marginal tax rate on rental profit |
| Home Appreciation | Expected annual home value increase % |
| Cost Inflation | Annual increase in taxes, insurance, HOA, maintenance % |
| Selling Fees | Realtor + closing costs % |
| Capital Gains Tax Rate | Tax on profits above basis |
| Investment Return | Expected return if you invest sale proceeds |

## How It Works

### Rent Scenario ("Rent Now + Sell Later")
- Calculates annual rental income with year-over-year growth
- Subtracts all ownership costs (P&I, taxes, insurance, HOA, maintenance, management)
- Applies cost inflation to non-fixed expenses
- Taxes positive rental profit at your specified rate
- Tracks cumulative cash flow over the holding period

### Sell Scenario ("Sell Now + Invest Proceeds")
- Calculates Year 0 net proceeds after fees and capital gains tax
- Projects that lump sum invested at your expected return rate
- If Year 0 proceeds are negative (underwater), no growth is applied

### Comparison
The chart and table show both scenarios side by side:
- **Rent Net Worth** = Net After-Tax Sale Proceeds (at that year) + Cumulative Rental Cash Flow
- **Sell Net Worth** = Year 0 Net Proceeds × (1 + Return Rate)^Year

## Files

- `index.html` — Main application
- `styles.css` — Styling (including responsive breakpoints)
- `calculator.js` — All calculation logic and UI updates
