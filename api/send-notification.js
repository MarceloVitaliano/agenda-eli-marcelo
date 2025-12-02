import webpush from "web-push";
import { getSubscriptionsForTargets } from "../subscriptionsStore.js";

const VAPID_PUBLIC_KEY = "BKAvhEy5n_cgZs2_8-jzvTuR_NT5Vm5BHdZOfqSJPkdjnuGPCNmptAmGoyRiWAj-t3TXpcf_RCW_hhLPfTUadSs";
const VAPID_PRIVATE_KEY = "FkrpwuWXJemVB-F8KLNdl0sGSqs1M191HNwa0G52PmA";

webpush.setVapidDetails(
  "mailto:tu-correo@ejemplo.com", // puedes poner tu Gmail, ej. hmencuadernaciones@gmail.com
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { title, body, targets } = req.body || {};

    if (!title || !body || !Array.isArray(targets) || targets.length === 0) {
      res.status(400).json({ error: "Datos inválidos (title/body/targets)" });
      return;
    }

    const subscriptions = getSubscriptionsForTargets(targets);
    const payload = JSON.stringify({ title, body });

    const results = await Promise.allSettled(
      subscriptions.map((sub) => webpush.sendNotification(sub, payload))
    );

    console.log("Resultados push:", results);

    res.status(200).json({
      ok: true,
      sent: subscriptions.length
    });
  } catch (err) {
    console.error("Error en /api/send-notification", err);
    res.status(500).json({ error: "Error interno en send-notification" });
  }
}
