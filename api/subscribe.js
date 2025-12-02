import { saveSubscription } from "../subscriptionsStore.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { owner, subscription } = req.body || {};

    if (!owner || !subscription) {
      res.status(400).json({ error: "Faltan datos (owner / subscription)" });
      return;
    }

    saveSubscription(owner, subscription);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Error en /api/subscribe", err);
    res.status(500).json({ error: "Error interno en subscribe" });
  }
}
