import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Gamepad2, Loader2, Plus, Users } from "lucide-react";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

type Room = { id: string; name: string; boardSize: 9 | 13 | 19; players: number; status: "open" | "playing" };

const demoRooms: Room[] = [
  { id: "coffee-9", name: "Coffee Corner", boardSize: 9, players: 1, status: "open" },
  { id: "ranked-13", name: "Quick Match", boardSize: 13, players: 1, status: "open" },
];

export function PlayLobby({ language, onBack }: { language: "en" | "pt"; onBack: () => void }) {
  const pt = language === "pt";
  const [rooms, setRooms] = useState<Room[]>(demoRooms);
  const [name, setName] = useState("");
  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(9);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "ready">("idle");

  useEffect(() => {
    if (!supabase) return;
    const channel: RealtimeChannel = supabase.channel("public-game-lobby", { config: { presence: { key: crypto.randomUUID() } } });
    setStatus("connecting");
    channel.on("broadcast", { event: "room-created" }, ({ payload }) => {
      setRooms((current) => current.some((room) => room.id === payload.id) ? current : [...current, payload as Room]);
    }).subscribe((subscriptionStatus) => setStatus(subscriptionStatus === "SUBSCRIBED" ? "ready" : "connecting"));
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const roomLink = useMemo(() => activeRoom ? `${window.location.origin}/?room=${activeRoom.id}` : "", [activeRoom]);

  function createRoom() {
    const room: Room = { id: crypto.randomUUID().slice(0, 8), name: name.trim() || (pt ? "Minha partida" : "My game"), boardSize, players: 1, status: "open" };
    setRooms((current) => [...current, room]);
    setActiveRoom(room);
  }

  async function copyRoomLink() {
    if (!roomLink) return;
    await navigator.clipboard.writeText(roomLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (activeRoom) {
    return (
      <main className="min-h-screen bg-paper px-4 py-8 text-ink sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <button type="button" onClick={() => setActiveRoom(null)} className="btn-quiet inline-flex w-fit items-center gap-2 px-3 py-2 text-sm"><ArrowLeft className="size-4" />{pt ? "Voltar ao lobby" : "Back to lobby"}</button>
          <section className="rounded-2xl border border-line bg-paper-2 p-6 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{pt ? "Sala pública" : "Public room"}</p><h1 className="mt-2 font-display text-3xl font-bold">{activeRoom.name}</h1><p className="mt-2 text-sm text-muted">{activeRoom.boardSize} × {activeRoom.boardSize} · {pt ? "Aguardando outro jogador" : "Waiting for another player"}</p></div><Users className="size-6 text-pine" /></div>
            <div className="mt-8 rounded-xl border border-dashed border-line bg-paper p-5"><p className="text-sm font-semibold">{pt ? "Convide um adversário" : "Invite an opponent"}</p><div className="mt-3 flex gap-2"><input readOnly value={roomLink} className="min-w-0 flex-1 rounded-lg border border-line bg-paper-2 px-3 py-2 text-xs text-muted" /><button type="button" onClick={copyRoomLink} className="btn-primary inline-flex items-center gap-2 px-3 py-2 text-sm"><Copy className="size-4" />{copied ? (pt ? "Copiado" : "Copied") : (pt ? "Copiar" : "Copy")}</button></div><p className="mt-3 text-xs text-muted">{status === "ready" ? (pt ? "Lobby online conectado." : "Online lobby connected.") : (pt ? "A sala será sincronizada quando o lobby online estiver disponível." : "The room will sync when the online lobby is available.")}</p></div>
            <button type="button" className="btn-primary mt-6 inline-flex items-center gap-2 px-4 py-2.5 text-sm opacity-60" disabled><Gamepad2 className="size-4" />{pt ? "Começar quando o adversário entrar" : "Start when opponent joins"}</button>
          </section>
        </div>
      </main>
    );
  }

  return <main className="min-h-screen bg-paper px-4 py-8 text-ink sm:px-8"><div className="mx-auto flex max-w-5xl flex-col gap-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><button type="button" onClick={onBack} className="btn-quiet mb-4 inline-flex items-center gap-2 px-3 py-2 text-sm"><ArrowLeft className="size-4" />{pt ? "Voltar à revisão" : "Back to review"}</button><h1 className="font-display text-4xl font-bold">{pt ? "Jogar online" : "Play online"}</h1><p className="mt-2 max-w-xl text-sm text-muted">{pt ? "Entre em uma sala pública ou crie uma partida para jogar Go contra outro jogador." : "Join a public room or create a game to play Go against another player."}</p></div><Users className="size-8 text-pine" /></div><div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><section className="rounded-2xl border border-line bg-paper-2 p-5 shadow-xs"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">{pt ? "Salas abertas" : "Open rooms"}</h2><span className="rounded-full bg-pine/10 px-2.5 py-1 text-xs font-semibold text-pine">{rooms.length}</span></div><div className="mt-4 flex flex-col gap-3">{rooms.map((room) => <button key={room.id} type="button" onClick={() => setActiveRoom({ ...room, players: 2, status: "playing" })} className="flex items-center justify-between rounded-xl border border-line bg-paper p-4 text-left transition hover:border-pine hover:shadow-xs"><span><span className="block font-semibold">{room.name}</span><span className="mt-1 block text-xs text-muted">{room.boardSize} × {room.boardSize} · {room.players}/2 {pt ? "jogadores" : "players"}</span></span><span className="text-sm font-semibold text-pine">{pt ? "Entrar" : "Join"}</span></button>)}</div></section><section className="rounded-2xl border border-line bg-paper-2 p-5 shadow-xs"><h2 className="font-display text-xl font-bold">{pt ? "Criar uma sala" : "Create a room"}</h2><label className="mt-5 block text-sm font-medium" htmlFor="room-name">{pt ? "Nome da sala" : "Room name"}</label><input id="room-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={pt ? "Ex.: Partida de domingo" : "e.g. Sunday game"} className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-pine" /><label className="mt-4 block text-sm font-medium" htmlFor="room-size">{pt ? "Tamanho do tabuleiro" : "Board size"}</label><select id="room-size" value={boardSize} onChange={(event) => setBoardSize(Number(event.target.value) as 9 | 13 | 19)} className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm"><option value={9}>9 × 9</option><option value={13}>13 × 13</option><option value={19}>19 × 19</option></select><button type="button" onClick={createRoom} className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"><Plus className="size-4" />{pt ? "Criar sala pública" : "Create public room"}</button>{status === "connecting" && <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted"><Loader2 className="size-3 animate-spin" />{pt ? "Conectando lobby..." : "Connecting lobby..."}</p>}</section></div></div></main>;
}
