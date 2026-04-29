// categories.js

async function loadCategories() {
  categories = await apiGet('/categories') || [];
  renderCategories();
}

function renderCategories() {
  const el = document.getElementById('category-grid');
  el.innerHTML = categories.map(c => `
    <div class="cat-card">
      <div class="cat-icon-wrap" style="background:${catBg(c.color)}">
        <span style="font-size:1.3rem">${c.icon}</span>
      </div>
      <div class="cat-info">
        <div class="cat-name">${c.name}</div>
        <div class="cat-type">${c.type} ${c.is_default ? '· default' : ''}</div>
      </div>
      ${!c.is_default ? `<button class="btn-icon-sm del" onclick="deleteCategory(${c.id})" title="Delete">✕</button>` : ''}
    </div>
  `).join('');
}

function openAddCategory() {
  const ICONS = ['📦','🏠','🚗','🍔','💊','📚','✈️','🎬','🛍️','💡','🎮','🐾','🎓','🎵','🏋️','🧴','💈','🌿'];
  const iconBtns = ICONS.map(ic =>
    `<button type="button" class="icon-pick-btn" onclick="selectIcon('${ic}')" style="font-size:1.4rem;background:none;border:1px solid var(--border);border-radius:8px;width:40px;height:40px;cursor:pointer">${ic}</button>`
  ).join('');

  openModal('New Category', `
    <div class="form-group">
      <label>Name</label>
      <input type="text" id="cat-name" placeholder="My Category" />
    </div>
    <div class="form-group">
      <label>Type</label>
      <select id="cat-type">
        <option value="expense">Expense</option>
        <option value="income">Income</option>
        <option value="both">Both</option>
      </select>
    </div>
    <div class="form-group">
      <label>Color</label>
      <input type="color" id="cat-color" value="#6366f1" style="width:60px;height:36px;border-radius:8px;border:1px solid var(--border);cursor:pointer;background:none" />
    </div>
    <div class="form-group">
      <label>Icon</label>
      <input type="hidden" id="cat-icon" value="📦" />
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${iconBtns}</div>
    </div>
    <div class="modal-actions">
      <button class="btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="saveCategory()">Create</button>
    </div>
  `);
}

function selectIcon(icon) {
  document.getElementById('cat-icon').value = icon;
  document.querySelectorAll('.icon-pick-btn').forEach(b => {
    b.style.background = b.textContent.trim() === icon ? 'rgba(99,102,241,0.2)' : 'none';
    b.style.borderColor = b.textContent.trim() === icon ? '#6366f1' : 'var(--border)';
  });
}

async function saveCategory() {
  const name  = document.getElementById('cat-name').value.trim();
  const type  = document.getElementById('cat-type').value;
  const color = document.getElementById('cat-color').value;
  const icon  = document.getElementById('cat-icon').value;
  if (!name) return showToast('Name required');

  await apiPost('/categories', { name, type, color, icon });
  showToast('Category created');
  closeModal();
  loadCategories();
}

async function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  await apiDelete(`/categories/${id}`);
  showToast('Deleted');
  loadCategories();
}
