/**
 * Rent vs Sell Calculator
 * All calculations are done client-side for instant updates
 */
(function() {
"use strict";

/**
 * Simple debounce utility to prevent excessive recalculations
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// DOM Elements
const inputs = {
  purchasePrice: document.getElementById("purchasePrice"),
  loanOriginDate: document.getElementById("loanOriginDate"),
  originalLoanAmount: document.getElementById("originalLoanAmount"),
  interestRate: document.getElementById("interestRate"),
  mortgageTerm: document.getElementById("mortgageTerm"),
  monthlyPI: document.getElementById("monthlyPI"),
  primaryResidence: document.getElementById("primaryResidence"),
  currentHomeValue: document.getElementById("currentHomeValue"),
  monthlyHOA: document.getElementById("monthlyHOA"),
  monthlyTaxes: document.getElementById("monthlyTaxes"),
  monthlyInsurance: document.getElementById("monthlyInsurance"),
  monthlyMaintenance: document.getElementById("monthlyMaintenance"),
  rentalPrice: document.getElementById("rentalPrice"),
  annualRentIncrease: document.getElementById("annualRentIncrease"),
  propertyMgmtFee: document.getElementById("propertyMgmtFee"),
  rentalTaxRate: document.getElementById("rentalTaxRate"),
  homeAppreciation: document.getElementById("homeAppreciation"),
  costInflation: document.getElementById("costInflation"),
  sellingFees: document.getElementById("sellingFees"),
  capitalGainsTax: document.getElementById("capitalGainsTax"),
  investmentReturn: document.getElementById("investmentReturn"),
  yearsToHold: document.getElementById("yearsToHold"),
};

let chart = null;
let currentYearlyData = null; // Store current data for tooltip access

/**
 * Calculate monthly P&I payment using standard mortgage formula
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
function calculateMonthlyPayment(principal, annualRate, years) {
  if (annualRate === 0) {
    return principal / (years * 12);
  }
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  return principal * (monthlyRate * factor) / (factor - 1);
}

/**
 * Update the displayed monthly payment
 */
function updateMonthlyPaymentDisplay() {
  const loanAmount = parseFloat(inputs.originalLoanAmount.value) || 0;
  const interestRate = parseFloat(inputs.interestRate.value) || 0;
  const term = parseInt(inputs.mortgageTerm.value) || 30;
  
  const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, term);
  inputs.monthlyPI.value = formatCurrency(monthlyPayment);
  
  return monthlyPayment;
}

// Debounced calculate function (100ms delay prevents excessive recalcs during typing)
const debouncedCalculate = debounce(calculate, 100);

// Add event listeners to all inputs
// Use 'input' for text/number fields (fires on each keystroke)
// Use 'change' for select fields (fires on selection)
Object.values(inputs).forEach((input) => {
  if (input && input.id !== 'monthlyPI') { // Skip the calculated field
    if (input.tagName === 'SELECT') {
      input.addEventListener("change", calculate); // Immediate for selects
    } else {
      input.addEventListener("input", debouncedCalculate); // Debounced for text/number
    }
  }
});

// Mobile tooltip: show label's title on focus (touch devices don't have hover)
const mobileTooltip = document.getElementById('mobileTooltip');

function showMobileTooltip(event) {
  const input = event.target;
  const label = document.querySelector(`label[for="${input.id}"]`);
  const tooltipText = label ? label.getAttribute('title') : null;
  
  if (tooltipText && mobileTooltip) {
    mobileTooltip.textContent = tooltipText;
    mobileTooltip.classList.add('active');
  }
}

function hideMobileTooltip() {
  if (mobileTooltip) {
    mobileTooltip.classList.remove('active');
  }
}

// Attach focus/blur listeners to all inputs for mobile tooltip
Object.values(inputs).forEach((input) => {
  if (input) {
    input.addEventListener('focus', showMobileTooltip);
    input.addEventListener('blur', hideMobileTooltip);
  }
});

/**
 * Calculate remaining loan balance after N months using amortization formula
 * @param {number} principal - Original loan amount
 * @param {number} monthlyRate - Monthly interest rate (annual rate / 12 / 100)
 * @param {number} totalMonths - Total loan term in months (typically 360 for 30-year)
 * @param {number} monthsPaid - Number of months already paid
 * @returns {number} Remaining balance
 */
function calculateRemainingBalance(
  principal,
  monthlyRate,
  totalMonths,
  monthsPaid,
) {
  if (monthlyRate === 0) {
    // Edge case: 0% interest
    return principal - (principal / totalMonths) * monthsPaid;
  }

  // Standard amortization formula for remaining balance
  // B = P * [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
  // Where: P = principal, r = monthly rate, n = total months, p = months paid
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const paidFactor = Math.pow(1 + monthlyRate, monthsPaid);

  const balance = (principal * (factor - paidFactor)) / (factor - 1);
  return Math.max(0, balance);
}

/**
 * Get months elapsed since loan origination
 * @param {string} originDateStr - Loan origination date string
 * @returns {number} Months elapsed (payments made)
 * Note: First payment is typically ~45 days after origination (skips a month)
 * e.g., Loan originated 7/19/2022, first payment 9/1/2022
 */
function getMonthsElapsed(originDateStr) {
  const originDate = new Date(originDateStr);
  const now = new Date();
  const months =
    (now.getFullYear() - originDate.getFullYear()) * 12 +
    (now.getMonth() - originDate.getMonth());
  // Subtract 1 because first payment skips a month after origination
  return Math.max(0, months - 1);
}

/**
 * Format number as currency
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Silently clamp a numeric input to a valid range.
 * Writes the clamped value back to the input element.
 * @param {HTMLInputElement} input - The input element
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {boolean} isInt - Whether to parse as integer
 * @returns {number} The clamped value
 */
function clampInput(input, min, max, isInt = false) {
  let val = isInt ? parseInt(input.value) : parseFloat(input.value);
  if (isNaN(val)) val = min;
  val = Math.min(max, Math.max(min, val));
  if (input.value !== "" && parseFloat(input.value) !== val) {
    input.value = val;
  }
  return val;
}

/**
 * Validate and clamp all inputs to sensible ranges.
 * Called at the start of each calculation cycle.
 */
function validateInputs() {
  clampInput(inputs.purchasePrice, 0, Infinity);
  clampInput(inputs.originalLoanAmount, 0, Infinity);
  clampInput(inputs.interestRate, 0, 30);
  clampInput(inputs.currentHomeValue, 0, Infinity);
  clampInput(inputs.monthlyHOA, 0, Infinity);
  clampInput(inputs.monthlyTaxes, 0, Infinity);
  clampInput(inputs.monthlyInsurance, 0, Infinity);
  clampInput(inputs.monthlyMaintenance, 0, Infinity);
  clampInput(inputs.rentalPrice, 0, Infinity);
  clampInput(inputs.annualRentIncrease, 0, 20);
  clampInput(inputs.propertyMgmtFee, 0, 100);
  clampInput(inputs.rentalTaxRate, 0, 100);
  clampInput(inputs.homeAppreciation, -20, 30);
  clampInput(inputs.costInflation, 0, 20);
  clampInput(inputs.sellingFees, 0, 100);
  clampInput(inputs.capitalGainsTax, 0, 100);
  clampInput(inputs.investmentReturn, -50, 50);
  clampInput(inputs.yearsToHold, 1, 30, true);

  // Validate loan origination date: must be a valid date not in the future
  const dateVal = inputs.loanOriginDate.value;
  const parsed = new Date(dateVal);
  if (!dateVal || isNaN(parsed.getTime()) || parsed > new Date()) {
    inputs.loanOriginDate.value = new Date().toISOString().split("T")[0];
  }
}

/**
 * Main calculation function
 */
function calculate() {
  // Validate all inputs first (silent clamping)
  validateInputs();

  // Update the displayed monthly payment first
  const monthlyPI = updateMonthlyPaymentDisplay();
  
  // Get all input values (now guaranteed to be valid after validation)
  const purchasePrice = parseFloat(inputs.purchasePrice.value) || 0;
  const loanOriginDate = inputs.loanOriginDate.value;
  const originalLoanAmount = parseFloat(inputs.originalLoanAmount.value) || 0;
  const interestRate = parseFloat(inputs.interestRate.value) || 0;
  const mortgageTerm = parseInt(inputs.mortgageTerm.value) || 30;
  const currentHomeValue = parseFloat(inputs.currentHomeValue.value) || 0;
  const monthlyHOA = parseFloat(inputs.monthlyHOA.value) || 0;
  const monthlyTaxes = parseFloat(inputs.monthlyTaxes.value) || 0;
  const monthlyInsurance = parseFloat(inputs.monthlyInsurance.value) || 0;
  const monthlyMaintenance = parseFloat(inputs.monthlyMaintenance.value) || 0;
  const rentalPrice = parseFloat(inputs.rentalPrice.value) || 0;
  const annualRentIncrease = parseFloat(inputs.annualRentIncrease.value) || 0;
  const propertyMgmtFee = parseFloat(inputs.propertyMgmtFee.value) || 0;
  const rentalTaxRate = parseFloat(inputs.rentalTaxRate.value) || 0;
  const homeAppreciation = parseFloat(inputs.homeAppreciation.value) || 0;
  const costInflation = parseFloat(inputs.costInflation.value) || 0;
  const sellingFees = parseFloat(inputs.sellingFees.value) || 0;
  const capitalGainsTax = parseFloat(inputs.capitalGainsTax.value) || 0;
  const investmentReturn = parseFloat(inputs.investmentReturn.value) || 0;
  const yearsToHold = parseInt(inputs.yearsToHold.value) || 10;
  const isPrimaryResidence = inputs.primaryResidence.value === "yes";

  // Derived values
  const monthlyRate = interestRate / 100 / 12;
  const totalLoanMonths = mortgageTerm * 12; // Use selected mortgage term
  const monthsElapsed = getMonthsElapsed(loanOriginDate);

  // Monthly PITI (P&I is fixed, but taxes/insurance inflate over time)
  // We'll calculate year-specific costs in the loop

// Results storage
  const yearlyData = [];

  // Cumulative tracking for rental scenario
  let cumulativeRentalCashFlow = 0;

  // Calculate for each year
  let sellYear0Baseline = 0;
  for (let year = 0; year <= yearsToHold; year++) {
    const futureMonthsElapsed = monthsElapsed + year * 12;

    // --- PROPERTY VALUES ---
    // Home value: Year 0 uses user-provided current value, future years apply appreciation
    const homeValue =
      currentHomeValue * Math.pow(1 + homeAppreciation / 100, year);

    // Loan balance at this year
    const loanBalance = calculateRemainingBalance(
      originalLoanAmount,
      monthlyRate,
      totalLoanMonths,
      futureMonthsElapsed,
    );

    // Equity
    const equity = homeValue - loanBalance;

    // --- RENTAL SCENARIO (for this specific year) ---
    // Rent at this year (with annual increases from now)
    // Delay rent increase by 1 year (Year 1 is same as input rent, Year 2 is +increase)
    const rentGrowthExponent = Math.max(0, year - 1);
    const currentRent =
      rentalPrice * Math.pow(1 + annualRentIncrease / 100, rentGrowthExponent);
    const annualRentalIncome = currentRent * 12;

    // Property management fee
    const annualMgmtFee = annualRentalIncome * (propertyMgmtFee / 100);

    // Annual expenses with inflation applied to non-fixed costs
    // P&I payment is fixed, but taxes, insurance, HOA, and maintenance inflate
    const inflationFactor = Math.pow(1 + costInflation / 100, year);
    const inflatedTaxes = monthlyTaxes * inflationFactor;
    const inflatedInsurance = monthlyInsurance * inflationFactor;
    const inflatedHOA = monthlyHOA * inflationFactor;
    const inflatedMaintenance = monthlyMaintenance * inflationFactor;
    const monthlyOwnershipCost = monthlyPI + inflatedTaxes + inflatedInsurance + inflatedHOA + inflatedMaintenance;
    const annualOwnershipCosts = monthlyOwnershipCost * 12;

    // Gross rental profit before tax
    const grossRentalProfit =
      annualRentalIncome - annualMgmtFee - annualOwnershipCosts;

    // Tax on rental profit (only if positive)
    const rentalTax =
      grossRentalProfit > 0 ? grossRentalProfit * (rentalTaxRate / 100) : 0;

    // Net cash flow from rental this year
    const netRentalCashFlow = grossRentalProfit - rentalTax;

    // For year 0, as per user request, we do not count any cash flow 
    // because that is the starting point/decision point
    const yearCashFlow = year === 0 ? 0 : netRentalCashFlow;

    // Update cumulative cash flow (add this year's total cash flow)
    cumulativeRentalCashFlow += yearCashFlow;

    // --- SALE SCENARIO ---
    // Selling costs (Removed prep costs per user request)
    const sellingCosts = homeValue * (sellingFees / 100);

    // Net proceeds before capital gains
    const netSaleProceeds = homeValue - loanBalance - sellingCosts;

    // Capital gains calculation
    const capitalGain = homeValue - purchasePrice; // Simplified: not accounting for improvements

    // Capital gains tax exemption for primary residence (IRS Section 121)
    // - Must have lived in home 2 of last 5 years to qualify
    // - Exemption is $250k single / $500k married filing jointly
    // - We use year <= 3 as proxy for "still qualifies" and assume MFJ ($500k cap)
    let capitalGainsTaxOwed = 0;
    
    // Check if underwater on the sale transaction itself
    const isUnderwater = netSaleProceeds < 0;
    // IRS exemption cap (assumes married filing jointly)
    const PRIMARY_RESIDENCE_EXEMPTION_CAP = 500000;

    if (capitalGain > 0) {
      if (isUnderwater) {
        // No cash to pay taxes, simplified assumption
        capitalGainsTaxOwed = 0;
      } else if (isPrimaryResidence && year <= 3) {
        // Primary Residence Exclusion applies, but only up to the cap
        const taxableGain = Math.max(0, capitalGain - PRIMARY_RESIDENCE_EXEMPTION_CAP);
        capitalGainsTaxOwed = taxableGain * (capitalGainsTax / 100);
      } else {
        // No exemption - tax the full gain
        capitalGainsTaxOwed = capitalGain * (capitalGainsTax / 100);
      }
    }
    // Net after-tax sale proceeds
    const netAfterTaxProceeds = netSaleProceeds - capitalGainsTaxOwed;

    // If we sell now and invest the proceeds, how much do we have at end of analysis period?
    // Only apply investment growth if proceeds are positive (can't invest a loss)
    const yearsToInvest = yearsToHold - year;
    const investedValue = netAfterTaxProceeds > 0
      ? netAfterTaxProceeds * Math.pow(1 + investmentReturn / 100, yearsToInvest)
      : netAfterTaxProceeds; // Keep the loss as-is, no "growth"

    // Capture Year 0 Baseline for Chart Comparison
    if (year === 0) {
        sellYear0Baseline = netAfterTaxProceeds;
    }

    // Calculate "Sell Year 0 Invested" for Chart
    // User Rule: If Year 0 Proceeds (Baseline) is positive, grow it by investment return.
    // If negative, show that negative value forever (no growth/debt interest).
    const sellYear0Total = sellYear0Baseline > 0 
        ? sellYear0Baseline * Math.pow(1 + investmentReturn / 100, year) 
        : sellYear0Baseline;

    // Simple Net Worth (Net Proceeds + Actual Cash Flow) - requested by user for table
    // User Update (Feb 2026): If Year 0 and we have positive proceeds, show $0 (don't show the cash out value).
    // If Year 0 and negative (underwater), show the negative value.
    let simpleRentalNetWorth = netAfterTaxProceeds + cumulativeRentalCashFlow;
    if (year === 0 && netAfterTaxProceeds > 0) {
        simpleRentalNetWorth = 0;
    }

    // For the SELL scenario, we want to compare apples to apples
    // The "sell now" value should show what you'd have at the END of the analysis period
    // if you sold at year X and invested the proceeds

    // Also need to account for positive rental cash flow that could have been invested
    // if you chose to rent for these years first then sell

    // Store year data (only properties used by live UI code)
    yearlyData.push({
      year,
      homeValue,
      loanBalance,
      equity,
      // Rental scenario
      netRentalCashFlow: yearCashFlow,
      cumulativeRentalCashFlow: year === 0 ? 0 : cumulativeRentalCashFlow,
      simpleRentalNetWorth,
      // Sale scenario
      sellingCosts,
      capitalGainsTaxOwed,
      netAfterTaxProceeds,
      sellYear0Total, // For chart
      // Comparison
      betterOption: simpleRentalNetWorth > sellYear0Total ? "rent" : "sell",
      monthlyBreakdown: {
        rent: year === 0 ? 0 : currentRent,
        expenses: year === 0 ? 0 : monthlyOwnershipCost + (annualMgmtFee / 12)
      }
    });
  }

  // Update UI
  updateChart(yearlyData);
  updateTable(yearlyData);
  updateSummary(yearlyData);

  // Persist current inputs to URL
  saveToURL();
}

/**
 * Update the comparison chart
 * Uses chart.update() for efficiency instead of destroy/recreate
 */
function updateChart(data) {
  // Store data for tooltip access (closure won't have stale data)
  currentYearlyData = data;
  
  const labels = data.map((d) => `Year ${d.year}`);
  const rentalData = data.map((d) => d.simpleRentalNetWorth);
  const saleData = data.map((d) => d.sellYear0Total);

  // If chart exists, just update the data
  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = rentalData;
    chart.data.datasets[1].data = saleData;
    chart.update('none'); // 'none' disables animations for faster updates
    return;
  }

  // Create chart on first run
  const ctx = document.getElementById("comparisonChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Cash Out + Rent P/L",
          data: rentalData,
          borderColor: "#4ade80",
          backgroundColor: "rgba(74, 222, 128, 0.1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Sell Now + Invest Proceeds",
          data: saleData,
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96, 165, 250, 0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: false, // Disable animations for faster updates
      plugins: {
        legend: {
          labels: {
            color: "#e4e4e4",
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += formatCurrency(context.parsed.y);
              }
              
              // Add monthly breakdown for the Rent scenario
              if (context.datasetIndex === 0 && currentYearlyData) { // Rent Line
                const yearIndex = context.dataIndex;
                const dataPoint = currentYearlyData[yearIndex];
                if (dataPoint && dataPoint.monthlyBreakdown) {
                  const rent = formatCurrency(dataPoint.monthlyBreakdown.rent);
                  const exp = formatCurrency(dataPoint.monthlyBreakdown.expenses);
                  return [
                    label,
                    `   Monthly Rent: ${rent}`,
                    `   Monthly Expenses: ${exp}`
                  ];
                }
              }
              return label;
            }
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#888" },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
        y: {
          ticks: {
            color: "#888",
            callback: function (value) {
              return formatCurrency(value);
            },
          },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
      },
    },
  });
}

/**
 * Helper to create a table cell with text content and optional class
 */
function createCell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

/**
 * Update the results table using DOM API (safer than innerHTML)
 */
function updateTable(data) {
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = "";

  data.forEach((d) => {
    const row = document.createElement("tr");
    row.className = d.betterOption === "rent" ? "rent-better" : "sell-better";

    // Year column with bold text
    const yearCell = document.createElement("td");
    const strong = document.createElement("strong");
    strong.textContent = `Year ${d.year}`;
    yearCell.appendChild(strong);
    row.appendChild(yearCell);

    // Data columns
    row.appendChild(createCell(formatCurrency(d.homeValue)));
    row.appendChild(createCell(formatCurrency(d.loanBalance)));
    row.appendChild(createCell(formatCurrency(d.equity)));
    row.appendChild(createCell(formatCurrency(d.sellingCosts)));
    row.appendChild(createCell(formatCurrency(d.capitalGainsTaxOwed)));
    row.appendChild(createCell(formatCurrency(d.netAfterTaxProceeds), d.netAfterTaxProceeds >= 0 ? "positive" : "negative"));
    row.appendChild(createCell(formatCurrency(d.netRentalCashFlow), d.netRentalCashFlow >= 0 ? "positive" : "negative"));
    row.appendChild(createCell(formatCurrency(d.cumulativeRentalCashFlow), d.cumulativeRentalCashFlow >= 0 ? "positive" : "negative"));
    row.appendChild(createCell(formatCurrency(d.simpleRentalNetWorth), d.simpleRentalNetWorth >= 0 ? "positive" : "negative"));
    row.appendChild(createCell(formatCurrency(d.sellYear0Total), d.sellYear0Total >= 0 ? "positive" : "negative"));

    tbody.appendChild(row);
  });
}

/**
 * Update summary section
 */
function updateSummary(data) {
  const finalYear = data[data.length - 1];
  // Update: User requested "Rent Now + Sell Later" (Cash Out + Rent P/L)
  const endRentalValue = finalYear.simpleRentalNetWorth;

  // Update: User requested "Sell Now + Invest Proceeds" (Sell Year 0 + Invest)
  const endSellValue = finalYear.sellYear0Total;
  
  const difference = endRentalValue - endSellValue;

  const summary = document.getElementById("summary");
  
  const summaryHTML = `
        <h3>📊 Summary at Year ${finalYear.year}</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="label">Rent Now + Sell Later</div>
                <div class="value ${endRentalValue >= 0 ? "positive" : "negative"}">${formatCurrency(endRentalValue)}</div>
            </div>
            <div class="summary-item">
                <div class="label">Sell Now + Invest Proceeds</div>
                <div class="value ${endSellValue >= 0 ? "positive" : "negative"}">${formatCurrency(endSellValue)}</div>
            </div>
            <div class="summary-item">
                <div class="label">Difference (Rent - Sell)</div>
                <div class="value ${difference >= 0 ? "positive" : "negative"}">${formatCurrency(difference)}</div>
            </div>
            <div class="summary-item">
                <div class="label">Better Option</div>
                <div class="value neutral">${difference >= 0 ? "🏠 Rent" : "💰 Sell"}</div>
            </div>
        </div>
    `;
  
  summary.innerHTML = summaryHTML;
}

/**
 * Save all current input values to URL search parameters.
 * Uses history.replaceState to avoid polluting browser history.
 */
function saveToURL() {
  const params = new URLSearchParams();

  Object.entries(inputs).forEach(([key, el]) => {
    if (!el || key === "monthlyPI") return; // Skip calculated field
    params.set(key, el.value);
  });

  const newURL = `${window.location.pathname}?${params.toString()}`;
  history.replaceState(null, "", newURL);
}

/**
 * Load input values from URL search parameters.
 * If a parameter exists in the URL, it overwrites the HTML default.
 * Called once before the initial calculation.
 */
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.size === 0) return; // No params, use HTML defaults

  Object.entries(inputs).forEach(([key, el]) => {
    if (!el || key === "monthlyPI") return; // Skip calculated field
    if (params.has(key)) {
      el.value = params.get(key);
    }
  });
}

// Load saved state from URL, then run initial calculation
loadFromURL();
calculate();

})(); // End IIFE
