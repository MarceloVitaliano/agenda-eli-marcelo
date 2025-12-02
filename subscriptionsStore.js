// Guardamos suscripciones en memoria por dueño del dispositivo.
// OJO: esto se pierde si Vercel reinicia la función (para algo serio-serio
// después lo podemos pasar a una base de datos).
const subscriptionsByOwner = {
  Marcelo: new Map(),
  Eli: new Map()
};

export function saveSubscription(owner, subscription) {
  const key = owner === "Eli" ? "Eli" : "Marcelo";
  const map = subscriptionsByOwner[key];
  map.set(subscription.endpoint, subscription);
}

export function getSubscriptionsForTargets(targets) {
  const set = new Set();

  targets.forEach((t) => {
    const key = t === "Eli" ? "Eli" : "Marcelo";
    const map = subscriptionsByOwner[key];
    for (const sub of map.values()) {
      set.add(sub);
    }
  });

  return Array.from(set);
}
