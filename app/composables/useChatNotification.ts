import type { ChatDialog } from '~~/shared/types/chat';
export function useChatNotification() {
  const { preferences } = useUserPreferences();
  const toast = useToast(); // Chat has its own switches, independent of information toasts.
  const seen = new Map<number, number>();
  let initialized = false;
  let audio: AudioContext | undefined;
  function unlock() {
    if (!preferences.value.notifications.chatSound) return;
    try { audio ||= new AudioContext(); void audio.resume().catch(() => {}); } catch { /* Unsupported/blocked audio. */ }
  }
  onMounted(() => { window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock); });
  onUnmounted(() => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); void audio?.close().catch(() => {}); });
  function observe(dialogs: ChatDialog[], myId: number, activeId?: number) {
    const incoming = dialogs.filter(d => d.last && d.last.id > (seen.get(d.id) || 0) && d.last.senderId !== myId && d.unread > 0 && !(d.id === activeId && !document.hidden && document.hasFocus()));
    for (const d of dialogs) if (d.last) seen.set(d.id, d.last.id);
    if (!initialized) { initialized = true; return; }
    if (!incoming.length) return;
    const settings = preferences.value.notifications;
    if (settings.chatPopup) toast.add({ id: 'space-chat-incoming', title: incoming.length === 1 ? 'Новое сообщение' : 'Новые сообщения', description: 'Откройте «Сообщения», чтобы прочитать.', color: 'info' });
    if (settings.chatSound && audio?.state === 'running') {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(.06, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .15);
      oscillator.start(); oscillator.stop(audio.currentTime + .16);
    }
  }
  return { observe, reset: () => { initialized = false; seen.clear(); } };
}
