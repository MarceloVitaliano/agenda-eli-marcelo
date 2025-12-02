// ====== CLAVES Y CONSTANTES ======
const STORAGE_KEY = "tareasAgendaEliMarcelo";
const DEVICE_OWNER_KEY = "agendaDeviceOwner";
const VAPID_PUBLIC_KEY = "BKAvhEy5n_cgZs2_8-jzvTuR_NT5Vm5BHdZOfqSJPkdjnuGPCNmptAmGoyRiWAj-t3TXpcf_RCW_hhLPfTUadSs";

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
let pushSubscription = null;

// ====== UTILES ======
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

function getCurrentDeviceOwner() {
  const stored = localStorage.getItem(DEVICE_OWNER_KEY);
  if (stored === "Eli" || stored === "Marcelo") return stored;
  return "Marcelo";
}

function saveCurrentDeviceOwner(owner) {
  localStorage.setItem(DEVICE_OWNER_KEY, owner);
}

// ====== CARGA INICIAL ======
window.addEventListener("DOMContentLoaded", async () => {
  // Cargar dueño del dispositivo
  const deviceOwner = getCurrentDeviceOwner();
  if (deviceOwnerSelect) {
    deviceOwnerSelect.value = deviceOwner;
    deviceOwnerSelect.addEventListener("change", () => {
      saveCurrentDeviceOwner(deviceOwnerSelect.value);
    });
  }

  // Cargar tareas desde localStorage
  const guardadas = localStorage.getItem(STORAGE_KEY);
  if (guardadas) {
    try {
      tareas = JSON.parse(guardadas) || [];
    } catch (e) {
      console.error("Error al leer localStorage:", e);
      tareas = [];
    }
  }

  tareas.forEach((tarea) => {
    const li = crearElementoTarea(tarea);
    tasksList.appendChild(li);
  });

  if (tareas.length > 0 && emptyText) {
    emptyText.style.display = "none";
  }

  // Ocultar botón si no hay soporte de notificaciones
  if (!("Notification" in window) && enableNotificationsBtn) {
    enableNotificationsBtn.style.display = "none";
  }
});

// ====== GUARDAR TAREAS ======
function guardarTareas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tareas));
}

// ====== FORM SUBMIT ======
taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const owner = ownerSelect.value;
  const date = dateInput.value;

  if (!title) return;

  const nuevaTarea = {
    id: Date.now().toString(),
    title,
    owner,
    date,
    done: false
  };

  tareas.push(nuevaTarea);
  guardarTareas();

  const li = crearElementoTarea(nuevaTarea);
  tasksList.appendChild(li);

  if (emptyText) emptyText.style.display = "none";

  // Enviar notificación PRO entre dispositivos
  enviarNotificacionServidor(nuevaTarea).catch((e) =>
    console.error("Error enviando notificación al servidor:", e)
  );

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

  checkbox.addEventListener("change", () => {
    tarea.done = checkbox.checked;
    li.classList.toggle("task-done", tarea.done);
    guardarTareas();
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

  deleteBtn.addEventListener("click", () => {
    li.remove();
    tareas = tareas.filter((t) => t.id !== tarea.id);
    guardarTareas();

    if (tasksList.children.length === 0 && emptyText) {
      emptyText.style.display = "block";
    }
  });

  li.appendChild(checkbox);
  li.appendChild(contentDiv);
  li.appendChild(deleteBtn);

  return li;
}

// ====== BOTÓN: ACTIVAR NOTIFICACIONES (SUSCRIPCIÓN PUSH) ======
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
      if (existingSub) {
        pushSubscription = existingSub;
      } else {
        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      const owner = getCurrentDeviceOwner();

      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          subscription: pushSubscription
        })
      });

      alert("Notificaciones push activadas para este dispositivo ✅");
    } catch (err) {
      console.error("Error al activar notificaciones:", err);
      alert("Hubo un error activando las notificaciones.");
    }
  });
}

// ====== ENVIAR NOTIFICACIÓN AL SERVIDOR (ENTRE DISPOSITIVOS) ======
async function enviarNotificacionServidor(tarea) {
  const fromOwner = getCurrentDeviceOwner();

  // ¿A quién hay que avisarle?
  // Si el dispositivo es Marcelo y la tarea es de Eli → puede ser raro,
  // así que la lógica simple será:
  // - Si tarea.owner es "Marcelo" → avisar a "Eli"
  // - Si tarea.owner es "Eli"     → avisar a "Marcelo"
  // - Si tarea.owner es "Ambos"   → avisar a ambos
  let targets = [];
  if (tarea.owner === "Marcelo") {
    targets = ["Eli"];
  } else if (tarea.owner === "Eli") {
    targets = ["Marcelo"];
  } else {
    targets = ["Marcelo", "Eli"];
  }

  const title = `${fromOwner} agregó un pendiente`;
  const body =
    tarea.title + (tarea.date ? ` — vence: ${tarea.date}` : "");

  await fetch("/api/send-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      body,
      targets
    })
  });
}

// ====== REGISTRO DEL SERVICE WORKER (PWA) ======
if ("serviceWorker" in navigator) {
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
}
