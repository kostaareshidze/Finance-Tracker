// budgets.js

let budgetYear  = new Date().getFullYear();
let budgetMonth = new Date().getMonth() + 1;

function changeBudgetMonth(dir) {
  budgetMonth += dir;
  if (budgetMonth > 12) { budgetMonth = 1;  budgetYear++; }
  if (budgetMonth < 1)  { budgetMonth = 12; budgetYear--; }
  loadBudgets();
}

async function loadBudgets() {
  const label = new Date(budgetYear, budgetMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  document.getElementById('budget-month-label').textContent = label;

  const budgets = await apiGet(`/budgets?year=${budgetYear}&month=${budgetMonth}`) || [];
  renderBudgets(budgets);
}

function renderBudgets(budgets) {
  const el = document.getElementById('budget-list');
  if (!budgets.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">◎</div><p>No budgets set for this month. Click "+ Set Budget" to get started.</p></div>';
    return;
  }

  el.innerHTML = budgets.map(b => {
    const pct     = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
    const over    = b.spent > b.amount;
    const warning = !over && pct >= 80;
    const color   = over ? '#f05a5a' : warning ? '#f59e0b' : (b.color || '#6366f1');

    return `
      <div class="budget-item">
        <div class="budget-item-header">
          <div class="budget-cat">
            <div class="tx-cat-icon" style="background:${catBg(b.color)};width:36px;height:36px;border-radius:9px;font-size:1rem">${b.icon || '📦'}</div>
            <span>${b.name || 'Category'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:1rem">
            <div class="budget-amounts">
              <strong>${fmt(b.spent)}</strong> / ${fmt(b.amount)}
            </div>
            <button class="btn-icon-sm del" onclick="deleteBudget(${b.id})">✕</button>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        ${warning ? `<div class="budget-warn">⚠ ${Math.round(pct)}% used — nearing limit</div>` : ''}
        ${over    ? `<div class="budget-over">✕ Over budget by ${fmt(b.spent - b.amount)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function openAddBudget() {
  const expenseCats = categories.filter(c => c.type === 'expense' || c.type === 'both');
  const catOpts = expenseCats.map(c =>
    `<option value="${c.id}">${c.icon} ${c.name}</option>`
  ).join('');

  openModal('Set Monthly Budget', `
    <div class="form-group">
      <label>Category</label>
      <select id="budget-cat">${catOpts}</select>
    </div>
    <div class="form-group">
      <label>Budget Amount</label>
      <input type="number" id="budget-amount" placeholder="0.00" min="1" step="0.01" />
    </div>
    <div class="modal-actions">
      <button class="btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="saveBudget()">Save</button>
    </div>
  `);
}

async function saveBudget() {
  const category_id = document.getElementById('budget-cat').value;
  const amount      = parseFloat(document.getElementById('budget-amount').value);
  if (!amount) return showToast('Enter a valid amount');

  await apiPost('/budgets', { category_id, amount, month: budgetMonth, year: budgetYear });
  showToast('Budget saved');
  closeModal();
  loadBudgets();
}

async function deleteBudget(id) {
  await apiDelete(`/budgets/${id}`);
  showToast('Budget removed');
  loadBudgets();
}
