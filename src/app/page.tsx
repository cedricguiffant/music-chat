"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// ─── URL detection helpers ──────────────────────────────────────────────

type Platform = "spotify" | "deezer" | "youtube" | "audio" | null;

function detectPlatform(url: string): Platform {
  if (/open\.spotify\.com/.test(url)) return "spotify";
  if (/deezer\.com|deezer\.page\.link/.test(url)) return "deezer";
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/\.(mp3|wav|ogg|flac|m4a|aac)(\?|$)/i.test(url)) return "audio";
  return null;
}

function extractSpotifyEmbed(url: string): string | null {
  // Handles: open.spotify.com/track/ID, /intl-xx/track/ID, /album/ID, /playlist/ID
  const match = url.match(
    /open\.spotify\.com(?:\/intl-[a-z]{2})?\/(track|album|playlist)\/([a-zA-Z0-9]+)/
  );
  if (!match) return null;
  const [, type, id] = match;
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
}

function extractDeezerEmbed(url: string): string | null {
  // Handles: deezer.com/xx/track/ID, /album/ID, /playlist/ID
  const match = url.match(
    /deezer\.com(?:\/[a-z]{2})?\/(track|album|playlist)\/(\d+)/
  );
  if (!match) return null;
  const [, type, id] = match;
  return `https://widget.deezer.com/widget/dark/${type}/${id}`;
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const match = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// ─── Avatar component ───────────────────────────────────────────────────

function Avatar({ nickname, color, size = 32 }: { nickname: string; color: string; size?: number }) {
  const initial = nickname.charAt(0).toUpperCase();
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `${color}22`,
        color: color,
        border: `2px solid ${color}44`,
      }}
    >
      {initial}
    </div>
  );
}

// ─── Equalizer animation ────────────────────────────────────────────────

function Equalizer() {
  return (
    <div className="flex items-end gap-[2px] h-4">
      <div className="eq-bar eq-bar-1" />
      <div className="eq-bar eq-bar-2" />
      <div className="eq-bar eq-bar-3" />
    </div>
  );
}

// ─── Platform badge ─────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: Platform }) {
  if (!platform) return null;
  const labels: Record<string, string> = {
    spotify: "Spotify",
    deezer: "Deezer",
    youtube: "YouTube",
    audio: "Audio",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        platform === "spotify"
          ? "badge-spotify"
          : platform === "deezer"
          ? "badge-deezer"
          : platform === "youtube"
          ? "badge-youtube"
          : "badge-youtube"
      }`}
    >
      {platform === "spotify" && <SpotifyIcon />}
      {platform === "deezer" && <DeezerIcon />}
      {platform === "youtube" && <YouTubeIcon />}
      {labels[platform]}
    </span>
  );
}

// ─── SVG Icons ──────────────────────────────────────────────────────────

function SpotifyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function DeezerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38H6.27zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.594v3.027h5.189v-3.027H6.27zm6.271 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19V16.81H0zm6.27 0v3.029h5.189V16.81H6.27zm6.271 0v3.029h5.19V16.81h-5.19zm6.27 0v3.029H24V16.81h-5.19z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 14 20 9 15 4" />
      <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  color: string;
  content: string;
  timestamp: number;
}

interface UserInfo {
  id: string;
  nickname: string;
  color: string;
  isDj: boolean;
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function Home() {
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [djUserId, setDjUserId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [selfId, setSelfId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [showTransferMenu, setShowTransferMenu] = useState(false);

  const isDj = useMemo(() => djUserId !== null && selfId === djUserId, [djUserId, selfId]);
  const platform = useMemo(() => (currentUrl ? detectPlatform(currentUrl) : null), [currentUrl]);
  const djUser = useMemo(() => users.find((u) => u.isDj), [users]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      setSelfId(socket.id ?? null);
    });

    socket.on(
      "state:init",
      (state: {
        djUserId: string | null;
        currentUrl: string | null;
        selfId: string;
        nickname: string;
        color: string;
        users: UserInfo[];
      }) => {
        setDjUserId(state.djUserId);
        setCurrentUrl(state.currentUrl);
        setSelfId(state.selfId);
        setNickname(state.nickname);
        setUsers(state.users);
      }
    );

    socket.on("chat:message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("dj:granted", ({ djUserId }: { djUserId: string }) => setDjUserId(djUserId));
    socket.on("dj:released", () => setDjUserId(null));

    socket.on("player:changed", ({ url }: { url: string | null }) => setCurrentUrl(url));
    socket.on("users:update", (userList: UserInfo[]) => setUsers(userList));

    return () => {
      socket.disconnect();
    };
  }, []);

  // Auto-play for audio when URL changes
  useEffect(() => {
    if (!currentUrl) return;
    const p = detectPlatform(currentUrl);
    if (p === "audio" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [currentUrl]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit("chat:message", text);
    setInput("");
  }, [input]);

  const requestDj = useCallback(() => {
    socketRef.current?.emit("dj:request");
  }, []);

  const releaseDj = useCallback(() => {
    socketRef.current?.emit("dj:release");
  }, []);

  const transferDj = useCallback((targetId: string) => {
    socketRef.current?.emit("dj:transfer", targetId);
    setShowTransferMenu(false);
  }, []);

  const changeTrack = useCallback(() => {
    if (!isDj) return;
    const url = urlInput.trim();
    if (!url) return;
    socketRef.current?.emit("player:change", { url });
    setUrlInput("");
  }, [isDj, urlInput]);

  const saveNickname = useCallback(() => {
    const clean = nicknameInput.trim();
    if (clean && socketRef.current) {
      socketRef.current.emit("user:setNickname", clean);
      setNickname(clean);
    }
    setEditingNickname(false);
  }, [nicknameInput]);

  function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  // ─── Render player based on platform ──────────────────────────────────

  function renderPlayer() {
    if (!currentUrl) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
          <div className="mb-3 rounded-full bg-[var(--surface-2)] p-4">
            <MusicIcon />
          </div>
          <p className="text-sm">Aucune musique en cours</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Le DJ peut ajouter un titre</p>
        </div>
      );
    }

    const spotifyEmbed = extractSpotifyEmbed(currentUrl);
    const deezerEmbed = extractDeezerEmbed(currentUrl);
    const ytId = platform === "youtube" ? extractYouTubeId(currentUrl) : null;

    if (spotifyEmbed) {
      return (
        <iframe
          key={spotifyEmbed}
          src={spotifyEmbed}
          width="100%"
          height="352"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl"
          style={{ border: "none" }}
        />
      );
    }

    if (deezerEmbed) {
      return (
        <iframe
          key={deezerEmbed}
          src={deezerEmbed}
          width="100%"
          height="300"
          allow="autoplay; clipboard-write; encrypted-media"
          loading="lazy"
          className="rounded-xl"
          style={{ border: "none" }}
        />
      );
    }

    if (ytId) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-xl">
          <iframe
            key={ytId}
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
            title="YouTube player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    // Default audio player
    return (
      <div className="rounded-xl bg-[var(--surface-2)] p-4">
        <audio
          key={currentUrl}
          ref={audioRef}
          src={currentUrl}
          controls
          autoPlay
          className="w-full"
        />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="bg-animated flex h-screen w-screen overflow-hidden">
      {/* ── Left Panel: Music + Users ──────────────────────────────── */}
      <div className="flex w-[420px] min-w-[380px] flex-col border-r border-[var(--border)]">
        {/* Header */}
        <div className="glass flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-black">
              <MusicIcon />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--text-primary)]">Music Chat</h1>
              <p className="text-[11px] text-[var(--text-muted)]">{users.length} en ligne</p>
            </div>
          </div>
          {currentUrl && <Equalizer />}
        </div>

        {/* DJ Controls */}
        <div className="glass-light px-5 py-3 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {djUser ? (
                <>
                  <div className="pulse-dot online-dot" />
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    DJ: <span className="text-[var(--accent)]">{djUser.id === selfId ? "Vous" : djUser.nickname}</span>
                  </span>
                </>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">Aucun DJ actif</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isDj ? (
                <>
                  {/* Transfer DJ button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowTransferMenu(!showTransferMenu)}
                      className="btn-ghost flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px]"
                    >
                      <TransferIcon />
                      Passer DJ
                    </button>
                    {showTransferMenu && (
                      <div className="glass absolute right-0 top-full z-50 mt-1 w-48 rounded-lg p-1 shadow-xl">
                        {users
                          .filter((u) => u.id !== selfId)
                          .map((u) => (
                            <button
                              key={u.id}
                              onClick={() => transferDj(u.id)}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                            >
                              <Avatar nickname={u.nickname} color={u.color} size={20} />
                              {u.nickname}
                            </button>
                          ))}
                        {users.filter((u) => u.id !== selfId).length === 0 && (
                          <p className="px-3 py-2 text-[11px] text-[var(--text-muted)]">Personne d&apos;autre en ligne</p>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={releaseDj}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--danger)] px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:brightness-110"
                  >
                    Quitter DJ
                  </button>
                </>
              ) : !djUserId ? (
                <button
                  onClick={requestDj}
                  className="btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px]"
                >
                  <CrownIcon />
                  Devenir DJ
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Music Player */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* URL Input (DJ only) */}
          {isDj && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Ajouter une musique
              </label>
              <div className="flex gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && changeTrack()}
                  placeholder="Lien Spotify, Deezer ou YouTube..."
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent)]"
                />
                <button
                  onClick={changeTrack}
                  className="btn-primary rounded-lg px-3 py-2 text-xs"
                >
                  Jouer
                </button>
              </div>
              <div className="mt-2 flex gap-1.5">
                <PlatformBadge platform="spotify" />
                <PlatformBadge platform="deezer" />
                <PlatformBadge platform="youtube" />
              </div>
            </div>
          )}

          {/* Now Playing */}
          {currentUrl && (
            <div className="mb-3 flex items-center gap-2">
              <Equalizer />
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                En cours de lecture
              </span>
              {platform && <PlatformBadge platform={platform} />}
            </div>
          )}

          {renderPlayer()}
        </div>

        {/* User List */}
        <div className="border-t border-[var(--border)] px-5 py-3">
          <div className="mb-2 flex items-center gap-2 text-[var(--text-muted)]">
            <UsersIcon />
            <span className="text-[11px] font-medium uppercase tracking-wider">
              En ligne ({users.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
            {users.map((u) => (
              <div
                key={u.id}
                className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] ${
                  u.isDj
                    ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]"
                    : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                }`}
              >
                <Avatar nickname={u.nickname} color={u.color} size={18} />
                <span className="font-medium">{u.id === selfId ? `${u.nickname} (vous)` : u.nickname}</span>
                {u.isDj && <CrownIcon />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Chat ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        {/* Chat Header */}
        <div className="glass flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Discussion</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Discutez en ecoutant de la musique ensemble
            </p>
          </div>

          {/* Nickname edit */}
          <div className="flex items-center gap-2">
            {editingNickname ? (
              <div className="flex items-center gap-1.5">
                <input
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveNickname()}
                  placeholder="Votre pseudo"
                  maxLength={20}
                  autoFocus
                  className="w-32 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <button onClick={saveNickname} className="btn-primary rounded-lg px-2 py-1 text-[11px]">
                  OK
                </button>
                <button onClick={() => setEditingNickname(false)} className="btn-ghost rounded-lg px-2 py-1 text-[11px]">
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNicknameInput(nickname);
                  setEditingNickname(true);
                }}
                className="btn-ghost flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px]"
              >
                <Avatar nickname={nickname} color={users.find((u) => u.id === selfId)?.color || "#1DB954"} size={20} />
                {nickname}
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-[var(--text-muted)]">
              <p className="text-sm">Pas encore de messages</p>
              <p className="mt-1 text-xs">Soyez le premier a envoyer un message !</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m) => {
                const isMe = m.userId === selfId;
                return (
                  <div key={m.id} className={`msg-enter flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                    <Avatar nickname={m.nickname} color={m.color} />
                    <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`flex items-baseline gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                        <span className="text-[11px] font-semibold" style={{ color: m.color }}>
                          {isMe ? "Vous" : m.nickname}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">{formatTime(m.timestamp)}</span>
                      </div>
                      <div
                        className={`mt-0.5 rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                          isMe
                            ? "rounded-tr-sm bg-[var(--accent)] text-black"
                            : "rounded-tl-sm bg-[var(--surface-2)] text-[var(--text-primary)]"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ecrivez votre message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent)]"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="btn-primary flex h-11 w-11 items-center justify-center rounded-xl"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
