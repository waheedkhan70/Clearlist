const STORAGE_KEY = "clearlist.tasks.v1";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const list = document.getElementById("task-list");
const empty = document.getElementById("empty-state");
const counter = document.getElementById("counter");
const errorEl = document.getElementById("form-error");
const announcer = document.getElementById("announcer");
const clearCompleted = document.getElementById("clear-completed");
const filterButtons = document.querySelectorAll("[data-filter]");

let tasks = loadTasks();
let filter = "all";

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    showError("Write a task before adding it.");
    input.setAttribute("aria-invalid", "true");
    input.focus();
    return;
  }

  clearError();
  tasks.unshift({
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: Date.now(),
  });
  input.value = "";
  persist();
  render();
  announce(`Added ${text}`);
  input.focus();
});

list.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const item = target.closest("[data-id]");
  if (!item) return;
  const id = item.dataset.id;
  const task = tasks.find((entry) => entry.id === id);
  if (!task) return;

  if (target.matches("input[type='checkbox']")) {
    task.done = target.checked;
    persist();
    render();
    announce(`${task.text} ${task.done ? "completed" : "marked active"}`);
    return;
  }

  if (target.matches("[data-delete]")) {
    tasks = tasks.filter((entry) => entry.id !== id);
    persist();
    render();
    announce(`Deleted ${task.text}`);
    input.focus();
  }
});

list.addEventListener("dblclick", (event) => {
  const title = event.target.closest(".title");
  if (!title) return;
  const item = title.closest("[data-id]");
  startEdit(item.dataset.id);
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    filterButtons.forEach((other) => {
      other.setAttribute("aria-pressed", String(other === button));
    });
    render();
  });
});

clearCompleted.addEventListener("click", () => {
  const removed = tasks.filter((task) => task.done).length;
  tasks = tasks.filter((task) => !task.done);
  persist();
  render();
  announce(`Cleared ${removed} completed ${removed === 1 ? "task" : "tasks"}`);
});

function startEdit(id) {
  const task = tasks.find((entry) => entry.id === id);
  const item = list.querySelector(`[data-id="${id}"]`);
  if (!task || !item) return;

  const editor = document.createElement("input");
  editor.type = "text";
  editor.value = task.text;
  editor.maxLength = 140;
  editor.setAttribute("aria-label", `Edit ${task.text}`);
  item.querySelector(".title").replaceWith(editor);
  editor.focus();
  editor.select();

  const finish = (save) => {
    const next = editor.value.trim();
    if (save && next) {
      task.text = next;
      persist();
      announce(`Updated task to ${next}`);
    }
    render();
  };

  editor.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    }
    if (event.key === "Escape") {
      finish(false);
    }
  });
  editor.addEventListener("blur", () => finish(true));
}

function visibleTasks() {
  if (filter === "active") return tasks.filter((task) => !task.done);
  if (filter === "completed") return tasks.filter((task) => task.done);
  return tasks;
}

function render() {
  const shown = visibleTasks();
  list.replaceChildren();

  shown.forEach((task) => {
    const li = document.createElement("li");
    li.dataset.id = task.id;
    li.className = task.done ? "done" : "";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", `Mark ${task.text} complete`);

    const title = document.createElement("p");
    title.className = "title";
    title.textContent = task.text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-btn";
    remove.dataset.delete = "true";
    remove.setAttribute("aria-label", `Delete ${task.text}`);
    remove.textContent = "Delete";

    li.append(checkbox, title, remove);
    list.append(li);
  });

  const remaining = tasks.filter((task) => !task.done).length;
  const doneCount = tasks.length - remaining;
  counter.textContent = `${remaining} ${remaining === 1 ? "item" : "items"} left`;
  empty.hidden = shown.length > 0;
  empty.textContent =
    tasks.length === 0
      ? "No tasks yet. Add the first one above."
      : "Nothing in this filter.";
  clearCompleted.hidden = doneCount === 0;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function showError(message) {
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
  input.removeAttribute("aria-invalid");
}

function announce(message) {
  announcer.textContent = message;
}

render();
