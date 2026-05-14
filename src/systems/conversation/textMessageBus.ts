export type TextMessagePayload = {
  id: string;
  text: string;
  createdAt: number;
};

const EVENT_NAME = "amispi-text-message";
const channel = typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("amispi_text_message")
  : null;

export function sendTextMessage(text: string): void {
  const trimmed = text.trim().slice(0, 200);
  if (!trimmed) return;
  const payload: TextMessagePayload = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    text: trimmed,
    createdAt: Date.now(),
  };
  channel?.postMessage(payload);
  window.dispatchEvent(new CustomEvent<TextMessagePayload>(EVENT_NAME, { detail: payload }));
}

export function subscribeTextMessages(handler: (payload: TextMessagePayload) => void): () => void {
  const seen = new Set<string>();
  const deliver = (payload: TextMessagePayload | undefined) => {
    if (!payload || seen.has(payload.id)) return;
    seen.add(payload.id);
    handler(payload);
  };

  const onWindow = (event: Event) => {
    deliver((event as CustomEvent<TextMessagePayload>).detail);
  };
  const onChannel = (event: MessageEvent<TextMessagePayload>) => {
    deliver(event.data);
  };

  window.addEventListener(EVENT_NAME, onWindow);
  channel?.addEventListener("message", onChannel);
  return () => {
    window.removeEventListener(EVENT_NAME, onWindow);
    channel?.removeEventListener("message", onChannel);
  };
}
