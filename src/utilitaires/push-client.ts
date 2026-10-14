export function urlBase64VersUint8Array(base64: string): Uint8Array {
  const remplissage = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalise = (base64 + remplissage).replace(/-/g, "+").replace(/_/g, "/");
  const brut = window.atob(normalise);
  const sortie = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i++) sortie[i] = brut.charCodeAt(i);
  return sortie;
}

export function supportePush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function abonnerPush(): Promise<PushSubscription | null> {
  const cle = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!cle) return null;

  const enregistrement = await navigator.serviceWorker.ready;
  const existant = await enregistrement.pushManager.getSubscription();
  if (existant) return existant;

  return enregistrement.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64VersUint8Array(cle) as BufferSource,
  });
}

export async function abonnementExistant(): Promise<PushSubscription | null> {
  if (!supportePush()) return null;
  const enregistrement = await navigator.serviceWorker.ready;
  return enregistrement.pushManager.getSubscription();
}
