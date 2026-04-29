// dashboard.js

let dashYear  = new Date().getFullYear();
let dashMonth = new Date().getMonth() + 1;
let barChart, pieChart;

function changeMonth(dir) {
  dashMonth += dir;
  if (dashMonth > 12) { dashMonth = 1;  dashYear++; }
  if (dashMonth < 1)  { dashMonth = 12; dashYear--; }
  loadDashboard();
}

async function loadDashboard() {
  const label = new Date(dashYear, dashMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  document.getElementById('month-label').textContent = label;

  const [summary, recent] = await Promise.all([
    apiGet(`/transactions/summary/monthly?year=${dashYear}&month=${dashMonth}`),
    apiGet(`/transactions?limit=8&start=${dashYear}-${String(dashMonth).padStart(2,'0')}-01&end=${dashYear}-${String(dashMonth).padStart(2,'0')}-31`)
  ]);

  if (!summary) return;

  const income  = summary.total_income  || 0;
  const expense = summary.total_expense || 0;
  const balance = income - expense;

  document.getElementById('stat-income').textContent  = fmt(income);
  document.getElementById('stat-expense').textContent = fmt(expense);
  document.getElementById('stat-balance').textContent = fmt(balance);
  document.getElementById('stat-count').textContent   = summary.count || 0;

  renderDashCharts(income, expense, summary.by_category || []);
  renderRecentTx(recent?.transactions || []);
}

function renderDashCharts(income, expense, byCategory) {
  const isDark = document.documentElement.dataset.theme !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#8b92a8' : '#5a6080';

  // Bar chart
  if (barChart) barChart.destroy();
  const barCtx = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expenses'],
      datasets: [{
        data: [income, expense],
        backgroundColor: ['rgba(16,217,138,0.25)', 'rgba(240,90,90,0.25)'],
        borderColor:     ['#10d98a', '#f05a5a'],
        borderWidth: 2,
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: gridColor }, ticks: { color: textColor, callback: v => fmt(v) } },
        x: { grid: { display: false }, ticks: { color: textColor } }
      }
    }
  });

  // Pie chart — expense breakdown
  const expCats = byCategory.filter(c => c.type === 'expense' && c.total > 0);
  if (pieChart) pieChart.destroy();
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  if (expCats.length === 0) {
    pieCtx.clearRect(0, 0, pieCtx.canvas.width, pieCtx.canvas.height);
    return;
  }
  pieChart = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: expCats.map(c => c.name || 'Other'),
      datasets: [{
        data: expCats.map(c => c.total),
        backgroundColor: expCats.map(c => (c.color || '#6366f1') + 'bb'),
        borderColor: expCats.map(c => c.color || '#6366f1'),
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position: 'right', labels: { color: textColor, boxWidth: 12, padding: 12, font: { size: 12 } } }
      },
      cutout: '65%'
    }
  });
}

function renderRecentTx(txs) {
  const el = document.getElementById('recent-transactions');
  if (!txs.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No transactions this month</p></div>';
    return;
  }
  el.innerHTML = txs.map(tx => `
    <div class="tx-item">
      <div class="tx-cat-icon" style="background:${catBg(tx.category_color)}">${txIcon(tx)}</div>
      <div class="tx-info">
        <div class="tx-desc">${tx.description || tx.category_name || 'Transaction'}</div>
        <div class="tx-meta">${tx.category_name || '—'} · ${tx.date}</div>
      </div>
      <div class="tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)}</div>
    </div>
  `).join('');
}

function openAddTransaction() {
  navigate('transactions');
  setTimeout(openTxModal, 100);
}
