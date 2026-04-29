// yearly.js

let currentYear = new Date().getFullYear();
let yearChart;

function changeYear(dir) {
  currentYear += dir;
  document.getElementById('year-label').textContent = currentYear;
  loadYearly();
}

async function loadYearly() {
  document.getElementById('year-label').textContent = currentYear;
  const data = await apiGet(`/transactions/summary/yearly?year=${currentYear}`);
  if (!data) return;

  const income  = data.total_income  || 0;
  const expense = data.total_expense || 0;
  const balance = income - expense;
  const rate    = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;

  document.getElementById('year-income').textContent  = fmt(income);
  document.getElementById('year-expense').textContent = fmt(expense);
  document.getElementById('year-balance').textContent = fmt(balance);
  document.getElementById('year-rate').textContent    = rate + '%';

  renderYearChart(data.months);
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function renderYearChart(months) {
  const isDark    = document.documentElement.dataset.theme !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#8b92a8' : '#5a6080';

  if (yearChart) yearChart.destroy();
  const ctx = document.getElementById('yearChart').getContext('2d');

  yearChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTH_NAMES,
      datasets: [
        {
          label: 'Income',
          data:  months.map(m => m.income),
          backgroundColor: 'rgba(16,217,138,0.2)',
          borderColor: '#10d98a',
          borderWidth: 2,
          borderRadius: 6,
          order: 2,
        },
        {
          label: 'Expenses',
          data:  months.map(m => m.expense),
          backgroundColor: 'rgba(240,90,90,0.2)',
          borderColor: '#f05a5a',
          borderWidth: 2,
          borderRadius: 6,
          order: 3,
        },
        {
          label: 'Net',
          data:  months.map(m => m.income - m.expense),
          type: 'line',
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129,140,248,0.08)',
          borderWidth: 2,
          pointBackgroundColor: '#818cf8',
          pointRadius: 4,
          fill: true,
          tension: 0.4,
          order: 1,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: textColor, boxWidth: 12, padding: 16, font: { size: 12 } } }
      },
      scales: {
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, callback: v => fmt(v) }
        },
        x: {
          grid: { display: false },
          ticks: { color: textColor }
        }
      }
    }
  });
}
