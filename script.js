// ---------- Shared Storage Helpers ----------
const STORAGE_KEY = "pptLibraryData";

function getPPTs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function savePPTs(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- Upload Page Logic ----------
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  const fileInput = document.getElementById("pptFile");
  const fileNameDisplay = document.getElementById("fileNameDisplay");
  const statusMsg = document.getElementById("statusMsg");

  fileInput.addEventListener("change", () => {
    fileNameDisplay.textContent = fileInput.files.length
      ? `Selected: ${fileInput.files[0].name}`
      : "";
  });

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
      showStatus("Please select a PPT file.", "error");
      return;
    }

    // Warn on large files since LocalStorage caps around 5-10MB
    if (file.size > 4 * 1024 * 1024) {
      showStatus("File too large for demo storage (max ~4MB). Choose a smaller file.", "error");
      return;
    }

    const base64 = await fileToBase64(file);

    const newEntry = {
      id: Date.now().toString(),
      fileName: file.name,
      fileData: base64,
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      category: document.getElementById("category").value,
      tags: document.getElementById("tags").value
        .split(",")
        .map(t => t.trim())
        .filter(Boolean),
      author: document.getElementById("author").value.trim(),
      date: new Date().toLocaleDateString()
    };

    const list = getPPTs();
    list.push(newEntry);
    savePPTs(list);

    showStatus("PPT uploaded successfully!", "success");
    uploadForm.reset();
    fileNameDisplay.textContent = "";
  });

  function showStatus(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className = "status-msg " + type;
  }
}

// ---------- Library Page Logic ----------
const cardGrid = document.getElementById("cardGrid");
if (cardGrid) {
  const emptyMsg = document.getElementById("emptyMsg");
  const searchInput = document.getElementById("searchInput");
  const filterCategory = document.getElementById("filterCategory");

  function renderCards() {
    const list = getPPTs();
    const query = searchInput.value.toLowerCase();
    const category = filterCategory.value;

    const filtered = list.filter(item => {
      const matchesQuery =
        item.title.toLowerCase().includes(query) ||
        item.author.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.tags.some(t => t.toLowerCase().includes(query));
      const matchesCategory = !category || item.category === category;
      return matchesQuery && matchesCategory;
    });

    cardGrid.innerHTML = "";

    if (filtered.length === 0) {
      emptyMsg.style.display = "block";
      return;
    }
    emptyMsg.style.display = "none";

    filtered.forEach(item => {
      const card = document.createElement("div");
      card.className = "ppt-card";
      card.innerHTML = `
        <h3>${escapeHtml(item.title)}</h3>
        <div class="meta">By ${escapeHtml(item.author)} • ${item.date} • ${escapeHtml(item.category)}</div>
        <div>${escapeHtml(item.description || "No description provided.")}</div>
        <div class="tags">
          ${item.tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("")}
        </div>
        <div class="card-actions">
          <a class="btn-download" href="${item.fileData}" download="${escapeHtml(item.fileName)}">Download</a>
          <button class="btn-delete" data-id="${item.id}">Delete</button>
        </div>
      `;
      cardGrid.appendChild(card);
    });

    document.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const updated = getPPTs().filter(p => p.id !== id);
        savePPTs(updated);
        renderCards();
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  searchInput.addEventListener("input", renderCards);
  filterCategory.addEventListener("change", renderCards);

  renderCards();
}
