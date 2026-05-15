// ── DOM References ──────────────────────────────────────────
const form         = document.getElementById('task-form');
const nameInput    = document.getElementById('task-name');
const descInput    = document.getElementById('task-desc');
const taskList     = document.getElementById('task-list');
const emptyState   = document.getElementById('empty-state');
const statsTotal   = document.getElementById('stats-total');
const statsComplete = document.getElementById('stats-completed');

const API = '/api/tasks';

// ── State ───────────────────────────────────────────────────
let tasks = [];

// ── Helpers ─────────────────────────────────────────────────
function updateStats() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  statsTotal.textContent     = `${total} task${total !== 1 ? 's' : ''}`;
  statsComplete.textContent  = `${completed} completed`;
  emptyState.classList.toggle('hidden', total > 0);
}

function createTaskElement(task) {
  const item = document.createElement('div');
  item.className = `task-item${task.completed ? ' completed' : ''}`;
  item.dataset.id = task.id;

  item.innerHTML = `
    <input type="checkbox" class="task-checkbox" aria-label="Mark complete"
           ${task.completed ? 'checked' : ''} />
    <div class="task-body">
      <div class="task-name">${escapeHTML(task.name)}</div>
      ${task.description ? `<div class="task-desc">${escapeHTML(task.description)}</div>` : ''}
    </div>
    <button class="btn-delete" aria-label="Delete task" title="Delete">🗑</button>
  `;

  // Toggle complete
  item.querySelector('.task-checkbox').addEventListener('change', () => toggleTask(task.id));

  // Delete
  item.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task.id, item));

  return item;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach(task => taskList.appendChild(createTaskElement(task)));
  updateStats();
}

// ── API Calls ───────────────────────────────────────────────
async function fetchTasks() {
  try {
    const res = await fetch(API);
    tasks = await res.json();
    renderTasks();
  } catch (err) {
    console.error('Failed to load tasks:', err);
  }
}

async function addTask(name, description) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });

    if (!res.ok) throw new Error('Failed to add task');

    const task = await res.json();
    tasks.unshift(task);
    taskList.prepend(createTaskElement(task));
    updateStats();
  } catch (err) {
    console.error(err);
  }
}

async function toggleTask(id) {
  try {
    const res = await fetch(`${API}/${id}`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to toggle task');

    const updated = await res.json();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) tasks[idx] = updated;

    // Update DOM
    const el = taskList.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.classList.toggle('completed', !!updated.completed);
      el.querySelector('.task-checkbox').checked = !!updated.completed;
    }
    updateStats();
  } catch (err) {
    console.error(err);
  }
}

async function deleteTask(id, element) {
  element.classList.add('removing');

  // Wait for animation to finish before hitting API
  element.addEventListener('animationend', async () => {
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');

      tasks = tasks.filter(t => t.id !== id);
      element.remove();
      updateStats();
    } catch (err) {
      console.error(err);
      element.classList.remove('removing');
    }
  }, { once: true });
}

// ── Events ──────────────────────────────────────────────────
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const desc = descInput.value.trim();
  if (!name) return;

  addTask(name, desc);
  nameInput.value = '';
  descInput.value = '';
  nameInput.focus();
});

// ── Init ────────────────────────────────────────────────────
fetchTasks();

// ── Splash Screen Orchestration ─────────────────────────────
window.addEventListener('load', () => {
  const splash = document.getElementById('splash');
  // Let the progress bar finish (1.5s) then dismiss
  setTimeout(() => {
    splash.classList.add('hide');
    document.body.classList.add('loaded');
    // Remove overlay from DOM after transition
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  }, 1500);
});
