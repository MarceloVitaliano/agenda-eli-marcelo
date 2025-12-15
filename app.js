// ====== CONFIGURACIÓN GENERAL ======
const DEVICE_OWNER_KEY = "agendaDeviceOwner";

// URL de tu backend en Render
const BACKEND_URL = "https://agenda-backend-q8ku.onrender.com";

// Tu VAPID PUBLIC KEY (igual que en Render, SOLO la pública)
const VAPID_PUBLIC_KEY = "BKAvhEy5n_cgZs2_8-jzvTuR_NT5Vm5BHdZOfqSJPkdjnuGPCNmptAmGoyRiWAj-t3TXpcf_RCW_hhLPfTUadSs";

// Cada cuánto refrescar tareas (ms)
const REFRESH_INTERVAL_MS = 5000;

// ====== REFERENCIAS AL DOM ======
const taskForm = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const ownerSelect = document.getElementById("task-owner");
const dateInput = document.getElementById("task-date");
const tasksList = document.getElementById("tasks-list");
const emptyText = document.querySelector(".empty-text");
const enableNotificationsBtn = document.getElementById("enable-notifications");
const deviceOwnerSelect = document.getElementById("device-owner");

// Estado en memoria
let tareas = [];
let refreshTimer = null;

// ====== UTILES ======
function getCurrentDeviceOwner() {
  const stored = localStorage.getItem(DEVICE_OWNER_KEY);
  if (stored === "Eli" || stored === "Marcelo") return stored;
  return "Marcelo";
}

function saveCurrentDeviceOwner(owner) {
  localStorage.setItem(DEVICE_OWNER_KEY, owner);
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ====== RENDER ======
function renderTasks() {
  tasksList.innerHTML = "";

  tareas.forEach((tarea) => {
    const li = crearElementoTarea(tarea);
    tasksList.appendChild(li);
  });

  if (emptyText) {
    emptyText.style.display = tareas.length > 0 ? "none" : "block";
  }
}

// ====== CARGAR TAREAS DESDE BACKEND ======
async function loadTasksFromBackend() {
  try {
    const resp = await fetch(`${BACKEND_URL}/tasks`, { cache: "no-store" });
    const data = await resp.json();
    tareas = Array.isArray(data.tasks) ? data.tasks : [];
  } catch (err) {
    console.error("Error cargando tareas del backend:", err);
    tareas = [];
  }

  renderTasks();
}

// ====== AUTO REFRESH ======
function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(loadTasksFromBackend, REFRESH_INTERVAL_MS);
}

// ====== CARGA INICIAL ======
window.addEventListener("DOMContentLoaded", async () => {
  // Dueño del dispositivo
  const deviceOwner = getCurrentDeviceOwner();
  if (deviceOwnerSelect) {
    deviceOwnerSelect.value = deviceOwner;

    deviceOwnerSelect.addEventListener("change", async () => {
      saveCurrentDeviceOwner(deviceOwnerSelect.value);
      await loadTasksFromBackend(); // 🔥 recarga cuando cambias dueño
    });
  }

  // Cargar tareas compartidas desde el backend
  await loadTasksFromBackend();

  // Iniciar refresco automático
  startAutoRefresh();

  // Si no hay Notification, ocultamos botón
  if (!("Notification" in window) && enableNotificationsBtn) {
    enableNotificationsBtn.style.display = "none";
  }
});

// ====== FORM SUBMIT (NUEVA TAREA) ======
taskForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const owner = ownerSelect.value;
  const date = dateInput.value;

  if (!title) return;

  const payload = { title, owner, date };

  try {
    const resp = await fetch(`${BACKEND_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || "Error creando tarea");
    }

    const nuevaTarea = await resp.json();

    // 🔥 En vez de push local (desincroniza), recargamos desde backend
    await loadTasksFromBackend();

    // Notificación cruzada
    await enviarNotificacionCruzada(nuevaTarea);
  } catch (err) {
    console.error("Error creando tarea:", err);
    alert("No se pudo crear la tarea, intenta de nuevo.");
  }

  taskForm.reset();
  ownerSelect.value = "Ambos";
});

// ====== CREAR ELEMENTO DE TAREA ======
function crearElementoTarea(tarea) {
  const li = document.createElement("li");
  li.className = "task-item";
  li.dataset.id = tarea.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = !!tarea.done;

  if (tarea.done) {
    li.classList.add("task-done");
  }

  checkbox.addEventListener("change", async () => {
    const nuevoEstado = checkbox.checked;
    li.classList.toggle("task-done", nuevoEstado);

    // Actualizar en backend
    try {
      const resp = await fetch(`${BACKEND_URL}/tasks/${tarea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nuevoEstado })
      });

      if (!resp.ok) throw new Error("No se pudo actualizar");

      // 🔥 Recargar para mantener todo igual en ambos
      await loadTasksFromBackend();
    } catch (err) {
      console.error("Error actualizando tarea:", err);
      alert("No se pudo actualizar la tarea. Intenta de nuevo.");
      await loadTasksFromBackend(); // volver al estado real
    }
  });

  const contentDiv = document.createElement("div");
  contentDiv.className = "task-content";

  const titleDiv = document.createElement("div");
  titleDiv.className = "task-title";
  titleDiv.textContent = tarea.title;

  const metaDiv = document.createElement("div");
  metaDiv.className = "task-meta";

  const ownerSpan = document.createElement("span");
  ownerSpan.textContent = tarea.owner;

  const dateSpan = document.createElement("span");
  dateSpan.textContent = tarea.date ? `Fecha límite: ${tarea.date}` : "";

  metaDiv.appendChild(ownerSpan);
  metaDiv.appendChild(dateSpan);
  contentDiv.appendChild(titleDiv);
  contentDiv.appendChild(metaDiv);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Borrar";

  deleteBtn.addEventListener("click", async () => {
    try {
      const resp = await fetch(`${BACKEND_URL}/tasks/${tarea.id}`, {
        method: "DELETE"
      });

      if (!resp.ok && resp.status !== 204) throw new Error("No se pudo borrar");

      // 🔥 Recargar para que ambos vean lo mismo
      await loadTasksFromBackend();
    } catch (err) {
      console.error("Error borrando tarea:", err);
      alert("No se pudo borrar la tarea. Intenta de nuevo.");
      await loadTasksFromBackend();
    }
  });

  li.appendChild(checkbox);
  li.appendChild(contentDiv);
  li.appendChild(deleteBtn);

  return li;
}

// ====== ACTIVAR NOTIFICACIONES (suscribe con backend) ======
if (enableNotificationsBtn) {
  enableNotificationsBtn.addEventListener("click", async () => {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        alert("Este navegador no soporta notificaciones push.");
        return;
      }

      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        alert("Para recibir notificaciones, permite el acceso en Ajustes.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();
      let subscription = existingSub;

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      const owner = getCurrentDeviceOwner();

      const resp = await fetch(`${BACKEND_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, subscription })
      });

      if (!resp.ok) throw new Error("No se pudo registrar suscripción");

      alert("Notificaciones push activadas para este dispositivo ✅");
    } catch (err) {
      console.error("Error al activar notificaciones:", err);
      alert("Hubo un error activando las notificaciones.");
    }
  });
}

// ====== ENVIAR NOTIFICACIÓN CRUZADA ======
async function enviarNotificacionCruzada(tarea) {
  try {
    const fromOwner = getCurrentDeviceOwner();

    let targets = [];
    if (fromOwner === "Marcelo") targets = ["Eli"];
    else if (fromOwner === "Eli") targets = ["Marcelo"];
    else targets = ["Marcelo", "Eli"];

    const title = `${fromOwner} agregó un pendiente`;
    const body = tarea.title + (tarea.date ? ` — vence: ${tarea.date}` : "");

    await fetch(`${BACKEND_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, targets })
    });
  } catch (err) {
    console.error("Error enviando notificación cruzada:", err);
  }
}

// ====== REGISTRO DEL SERVICE WORKER + ESCUCHA MENSAJES ======
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => console.log("Service Worker registrado"))
      .catch((err) => console.error("Error al registrar Service Worker:", err));
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "refreshTasks") {
      console.log("Mensaje de SW: refreshTasks → recargando tareas");
      loadTasksFromBackend();
    }
  });
}
