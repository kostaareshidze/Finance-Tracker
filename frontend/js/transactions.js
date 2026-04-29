// transactions.js

let txPage = 1;
let editingTxId = null;

async function loadTransactions() {
  populateCategoryFilter();
  await fetchTransactions();
}

function populateCategoryFilter() {
  const sel = document.getElementById('filter-category');
  sel.innerHTML = '<option value="">All Categories</option>' +
    categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

async function fetchTransactions() {
  const search   = document.getElementById('search-input').value;
  const type     = document.getElementById('filter-type').value;
  const category = document.getElementById('filter-category').value;
  const start    = document.getElementById('filter-start').value;
  const end      = document.getElementById('filter-end').value;

  const params = new URLSearchParams({ page: txPage, limit: 20 });
  if (search)   params.set('search',   search);
  if (type)     params.set('type',     type);
  if (category) params.set('category', category);
  if (start)    params.set('start',    start);
  if (end)      params.set('end',      end);

  const data = await apiGet(`/transactions?${params}`);
  if (!data) return;

  renderTxTable(data.transactions);
  renderPagination(data.pages);
}

function filterTransactions() {
  txPage = 1;
  fetchTransactions();
}

function renderTxTable(txs) {
  const tbody = document.getElementById('tx-tbody');
  if (!txs.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🔍</div><p>No transactions found</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = txs.map(tx => `
    <tr>
      <td style="font-family:var(--mono);font-size:0.82rem;color:var(--text2)">${tx.date}</td>
      <td>${tx.description || '<em style="color:var(--text3)">No description</em>'}</td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span style="background:${catBg(tx.category_color)};border-radius:6px;padding:2px 6px;font-size:0.85rem">
            ${tx.category_icon || '📦'} ${tx.category_name || '—'}
          </span>
        </span>
      </td>
      <td><span class="type-badge ${tx.type}">${tx.type}</span></td>
      <td class="tx-amount ${tx.type}" style="font-family:var(--mono)">
        ${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)}
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-icon-sm" onclick="editTx(${tx.id})">✎</button>
          <button class="btn-icon-sm del" onclick="deleteTx(${tx.id})">✕</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderPagination(pages) {
  const el = document.getElementById('tx-pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn${i === txPage ? ' active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  el.innerHTML = html;
}

function goPage(p) { txPage = p; fetchTransactions(); }

function openTxModal(tx = null) {
  editingTxId = tx?.id || null;
  const catOpts = categories.map(c =>
    `<option value="${c.id}" ${tx?.category_id === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`
  ).join('');

  const today = new Date().toISOString().split('T')[0];

  openModal(tx ? 'Edit Transaction' : 'Add Transaction', `
    <div class="type-toggle">
      <button id="btn-income"  onclick="setTxType('income')"  class="${(!tx || tx.type==='income') ? 'active-income' : ''}">↑ Income</button>
      <button id="btn-expense" onclick="setTxType('expense')" class="${tx?.type==='expense' ? 'active-expense' : ''}">↓ Expense</button>
    </div>
    <input type="hidden" id="tx-type" value="${tx?.type || 'income'}" />
    <div class="form-group">
      <label>Amount</label>
      <input type="number" id="tx-amount" placeholder="0.00" min="0.01" step="0.01" value="${tx?.amount || ''}" required />
    </div>
    <div class="form-group">
      <label>Category</label>
      <select id="tx-category"><option value="">— Select —</option>${catOpts}</select>
    </div>
    <div class="form-group">
      <label>Date</label>
      <input type="date" id="tx-date" value="${tx?.date || today}" required />
    </div>
    <div class="form-group">
      <label>Description</label>
      <input type="text" id="tx-desc" placeholder="Optional note..." value="${tx?.description || ''}" />
    </div>
    <div class="modal-actions">
      <button class="btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="saveTx()">Save</button>
    </div>
  `);
}

function setTxType(type) {
  document.getElementById('tx-type').value = type;
  document.getElementById('btn-income').className  = type === 'income'  ? 'active-income'  : '';
  document.getElementById('btn-expense').className = type === 'expense' ? 'active-expense' : '';
}

async function saveTx() {
  const body = {
    type:        document.getElementById('tx-type').value,
    amount:      parseFloat(document.getElementById('tx-amount').value),
    category_id: document.getElementById('tx-category').value || null,
    date:        document.getElementById('tx-date').value,
    description: document.getElementById('tx-desc').value,
  };

  if (!body.amount || !body.date) return showToast('Amount and date are required');

  try {
    if (editingTxId) {
      await apiPut(`/transactions/${editingTxId}`, body);
      showToast('Transaction updated');
    } else {
      await apiPost('/transactions', body);
      showToast('Transaction added');
    }
    closeModal();
    fetchTransactions();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

async function editTx(id) {
  const data = await apiGet(`/transactions?limit=1`);
  // Fetch that specific tx by reloading list with no filters and finding it
  const allData = await apiGet('/transactions?limit=500');
  const tx = allData?.transactions?.find(t => t.id === id);
  if (tx) openTxModal(tx);
}

async function deleteTx(id) {
  if (!confirm('Delete this transaction?')) return;
  await apiDelete(`/transactions/${id}`);
  showToast('Deleted');
  fetchTransactions();
}

async function exportCSV() {
  const start = document.getElementById('filter-start').value;
  const end   = document.getElementById('filter-end').value;
  let path = '/transactions/export/csv';
  const p = new URLSearchParams();
  if (start) p.set('start', start);
  if (end)   p.set('end', end);
  if ([...p].length) path += '?' + p;
  await apiDownload(path);
  showToast('CSV exported!');
}
