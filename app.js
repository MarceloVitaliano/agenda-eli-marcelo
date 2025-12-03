// ====== CONFIGURACIÓN GENERAL ======
const DEVICE_OWNER_KEY = "agendaDeviceOwner";

// URL de tu backend en Render
const BACKEND_URL = "https://agenda-backend-q8ku.onrender.com";

// Tu VAPID PUBLIC KEY (igual que en Render, SOLO la pública)
const VAPID_PUBLIC_KEY = "BKAvhEy5n_cgZs2_8-jzvTuR_NT5Vm5BHdZOfqSJPkdjnuGPCNmptAmGoyRiWAj-t3TXpcf_RCW_hhLPfTUadSs"; // <-- pon aquí tu clave

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

// ====== CARGAR TAREAS DESDE BACKEND Y RENDERIZAR ======
async function loadTasksFromBackend() {
  try {
    const resp = await fetch(`${BACKEND_URL}/tasks`);
    const data = await resp.json();
    tareas = data.tasks || [];
  } catch (err) {
    console.error("Error cargando tareas del backend:", err);
    tareas = [];
  }

  // Limpiar lista en pantalla y volver a dibujar
  tasksList.innerHTML = "";

  tareas.forEach((tarea) => {
    const li = crearElementoTarea(tarea);
    tasksList.appendChild(li);
  });

  if (emptyText) {
    emptyText.style.display = tareas.length > 0 ? "none" : "block";
  }
}

// ====== CARGA INICIAL ======
window.addEventListener("DOMContentLoaded", async () => {
  // Dueño del dispositivo
  const deviceOwner = getCurrentDeviceOwner();
  if (deviceOwnerSelect) {
    deviceOwnerSelect.value = deviceOwner;
    deviceOwnerSelect.addEventListener("change", () => {
      saveCurrentDeviceOwner(deviceOwnerSelect.value);
    });
  }

  // Cargar tareas compartidas desde el backend
  await loadTasksFromBackend();

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

  const payload = {
    title,
    owner,
    date
  };

  try {
    // Crear tarea en backend
    const resp = await fetch(`${BACKEND_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const nuevaTarea = await resp.json();

    // Actualizar arreglo local
    tareas.push(nuevaTarea);

    const li = crearElementoTarea(nuevaTarea);
    tasksList.appendChild(li);

    if (emptyText) emptyText.style.display = "none";

    // Enviar notificación cruzada
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
  checkbox.checked = tarea.done;

  if (tarea.done) {
    li.classList.add("task-done");
  }

  checkbox.addEventListener("change", async () => {
    const nuevoEstado = checkbox.checked;
    li.classList.toggle("task-done", nuevoEstado);

    // Actualizar en array local
    const idx = tareas.findIndex((t) => t.id === tarea.id);
    if (idx !== -1) {
      tareas[idx].done = nuevoEstado;
    }

    // Actualizar en backend
    try {
      await fetch(`${BACKEND_URL}/tasks/${tarea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nuevoEstado })
      });
    } catch (err) {
      console.error("Error actualizando tarea:", err);
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
  dateSpan.textContent = tarea.date
    ? `Fecha límite: ${tarea.date}`
    : "";

  metaDiv.appendChild(ownerSpan);
  metaDiv.appendChild(dateSpan);
  contentDiv.appendChild(titleDiv);
  contentDiv.appendChild(metaDiv);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Borrar";

  deleteBtn.addEventListener("click", async () => {
    li.remove();
    tareas = tareas.filter((t) => t.id !== tarea.id);

    if (tasksList.children.length === 0 && emptyText) {
      emptyText.style.display = "block";
    }

    // Borrar en backend
    try {
      await fetch(`${BACKEND_URL}/tasks/${tarea.id}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.error("Error borrando tarea:", err);
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

      await fetch(`${BACKEND_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          subscription
        })
      });

      alert("Notificaciones push activadas para este dispositivo ✅");
    } catch (err) {
      console.error("Error al activar notificaciones:", err);
      alert("Hubo un error activando las notificaciones.");
    }
  });
}

// ====== ENVIAR NOTIFICACIÓN CRUZADA ======
async function enviarNotificacionCruzada(tarea) {
  const fromOwner = getCurrentDeviceOwner();

  // Lógica: si el dispositivo es de Marcelo → notifica a Eli
  //         si el dispositivo es de Eli     → notifica a Marcelo
  let targets = [];

  if (fromOwner === "Marcelo") {
    targets = ["Eli"];
  } else if (fromOwner === "Eli") {
    targets = ["Marcelo"];
  } else {
    targets = ["Marcelo", "Eli"];
  }

  const title = `${fromOwner} agregó un pendiente`;
  const body =
    tarea.title + (tarea.date ? ` — vence: ${tarea.date}` : "");

  await fetch(`${BACKEND_URL}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      body,
      targets
    })
  });
}

// ====== REGISTRO DEL SERVICE WORKER + ESCUCHA MENSAJES ======
if ("serviceWorker" in navigator) {
  // Registrar SW
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => {
        console.log("Service Worker registrado");
      })
      .catch((err) => {
        console.error("Error al registrar Service Worker:", err);
      });
  });

  // Escuchar mensajes del Service Worker (para refrescar tareas)
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "refreshTasks") {
      console.log("Mensaje de SW: refreshTasks → recargando tareas");
      loadTasksFromBackend();
    }
  });
}
