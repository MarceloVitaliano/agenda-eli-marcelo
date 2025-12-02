// ====== CLAVE DE LOCALSTORAGE ======
const STORAGE_KEY = "tareasAgendaEliMarcelo";

// ====== REFERENCIAS A LOS ELEMENTOS DEL HTML ======
const taskForm = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const ownerSelect = document.getElementById("task-owner");
const dateInput = document.getElementById("task-date");
const tasksList = document.getElementById("tasks-list");
const emptyText = document.querySelector(".empty-text");
const enableNotificationsBtn = document.getElementById("enable-notifications");

// Arreglo en memoria con las tareas
let tareas = [];

// ====== CARGAR TAREAS AL INICIAR ======
window.addEventListener("DOMContentLoaded", () => {
  const guardadas = localStorage.getItem(STORAGE_KEY);

  if (guardadas) {
    try {
      tareas = JSON.parse(guardadas) || [];
    } catch (e) {
      console.error("Error al leer localStorage:", e);
      tareas = [];
    }
  }

  // Pintar las tareas guardadas
  tareas.forEach((tarea) => {
    const li = crearElementoTarea(tarea);
    tasksList.appendChild(li);
  });

  if (tareas.length > 0 && emptyText) {
    emptyText.style.display = "none";
  }

  // Si el navegador NO soporta notificaciones, ocultamos el botón
  if (!("Notification" in window) && enableNotificationsBtn) {
    enableNotificationsBtn.style.display = "none";
  }
});

// ====== GUARDAR EN LOCALSTORAGE ======
function guardarTareas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tareas));
}

// ====== EVENTO: Enviar formulario ======
taskForm.addEventListener("submit", function (event) {
  event.preventDefault(); // Evita que recargue la página

  const title = titleInput.value.trim();
  const owner = ownerSelect.value;
  const date = dateInput.value;

  // Si está vacío no hacemos nada
  if (!title) return;

  // Crear objeto de tarea
  const nuevaTarea = {
    id: Date.now().toString(), // id simple
    title: title,
    owner: owner,
    date: date,
    done: false
  };

  // Guardar en arreglo
  tareas.push(nuevaTarea);
  guardarTareas();

  // Crear el elemento visual y añadirlo
  const li = crearElementoTarea(nuevaTarea);
  tasksList.appendChild(li);

  // Ocultar mensaje vacío
  if (emptyText) emptyText.style.display = "none";

  // Lanzar notificación local (en este dispositivo) si está permitido
  mostrarNotificacionLocal(nuevaTarea);

  // Limpiar formulario
  taskForm.reset();
  ownerSelect.value = "Ambos";
});

// ====== FUNCIÓN: Crear un <li> con toda la tarea completa ======
function crearElementoTarea(tarea) {
  const li = document.createElement("li");
  li.className = "task-item";
  li.dataset.id = tarea.id;

  // ===== Checkbox =====
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

  // ===== Contenido =====
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

  // ===== Botón de borrar =====
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Borrar";

  deleteBtn.addEventListener("click", () => {
    li.remove();

    // Eliminar del arreglo por id
    tareas = tareas.filter((t) => t.id !== tarea.id);
    guardarTareas();

    if (tasksList.children.length === 0 && emptyText) {
      emptyText.style.display = "block";
    }
  });

  // Armado final
  li.appendChild(checkbox);
  li.appendChild(contentDiv);
  li.appendChild(deleteBtn);

  return li;
}

// ====== NOTIFICACIONES LOCALES ======

if (enableNotificationsBtn) {
  enableNotificationsBtn.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      alert("Este navegador no soporta notificaciones");
      return;
    }

    const permiso = await Notification.requestPermission();

    if (permiso === "granted") {
      alert("Listo, este dispositivo ya puede recibir notificaciones de la agenda ✅");
    } else if (permiso === "denied") {
      alert("Bloqueaste las notificaciones. Para activarlas, cambia el permiso en Ajustes del navegador.");
    }
  });
}

function mostrarNotificacionLocal(tarea) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const tituloNoti = `${tarea.owner} agregó un pendiente`;
  const cuerpoNoti =
    tarea.title + (tarea.date ? ` — vence: ${tarea.date}` : "");

  new Notification(tituloNoti, {
    body: cuerpoNoti,
    icon: "icon-192.png"
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
