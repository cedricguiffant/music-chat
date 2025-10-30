"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

function isYouTubeUrl(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1) || null;
    }
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const match = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [messages, setMessages] = useState<{ id: string; userId: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [djUserId, setDjUserId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [selfId, setSelfId] = useState<string | null>(null);

  const isDj = useMemo(() => djUserId !== null && selfId === djUserId, [djUserId, selfId]);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      setSelfId(socket.id);
    });

    socket.on("state:init", (state: { djUserId: string | null; currentUrl: string | null }) => {
      setDjUserId(state.djUserId);
      setCurrentUrl(state.currentUrl);
    });

    socket.on("chat:message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("dj:granted", ({ djUserId }) => setDjUserId(djUserId));
    socket.on("dj:released", () => setDjUserId(null));

    socket.on("player:changed", ({ url }) => setCurrentUrl(url));

    return () => {
      socket.disconnect();
    };
  }, []);

  // Auto-play pour MP3 quand l'URL change
  useEffect(() => {
    if (!currentUrl) return;
    if (!isYouTubeUrl(currentUrl) && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [currentUrl]);

  function sendMessage() {
    const text = input.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit("chat:message", text);
    setInput("");
  }

  function requestDj() {
    socketRef.current?.emit("dj:request");
  }

  function changeTrack() {
    if (!isDj) return;
    const url = urlInput.trim();
    if (!url) return;
    socketRef.current?.emit("player:change", { url });
    setUrlInput("");
  }

  const ytId = currentUrl && isYouTubeUrl(currentUrl) ? extractYouTubeId(currentUrl) : null;

  return (
    <div className="flex min-h-screen items-start justify-center bg-[#121212] p-6">
      <main className="flex w-full max-w-3xl flex-col gap-6 rounded-xl border border-[#282828] bg-[#121212] p-6 text-white">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Music DJ Chat</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={requestDj}
              className="rounded-full bg-[#1DB954] px-4 py-2 text-sm font-medium text-black transition-colors hover:brightness-95"
            >
              Bouton DJ
            </button>
            <span className="text-sm text-zinc-300">
              {isDj ? "Vous êtes le DJ" : djUserId ? "DJ: "+djUserId : "Aucun DJ"}
            </span>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="URL de la piste (YouTube/mp3)"
              className="flex-1 rounded-md border border-[#282828] bg-[#181818] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
            />
            <button
              onClick={changeTrack}
              disabled={!isDj}
              className="rounded-full bg-[#1DB954] px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Changer la musique
            </button>
          </div>

          {currentUrl ? (
            <div className="flex flex-col gap-3">
              <div className="text-sm text-zinc-300 break-all">Piste actuelle: {currentUrl}</div>
              {ytId ? (
                <div className="aspect-video w-full overflow-hidden rounded-md border border-[#282828]">
                  <iframe
                    key={ytId}
                    className="h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
                    title="YouTube player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <audio key={currentUrl} ref={audioRef} src={currentUrl} controls autoPlay className="w-full" />
              )}
            </div>
          ) : (
            <div className="text-sm text-zinc-400">Aucune piste en cours</div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="h-64 w-full overflow-auto rounded-md border border-[#282828] bg-[#181818] p-3">
            <ul className="flex flex-col gap-2 text-sm">
              {messages.map((m) => (
                <li key={m.id} className="flex gap-2">
                  <span className="text-zinc-400">{m.userId === selfId ? "Vous" : m.userId}:</span>
                  <span className="text-zinc-100">{m.content}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre message"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              className="flex-1 rounded-md border border-[#282828] bg-[#181818] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
            />
            <button
              onClick={sendMessage}
              className="rounded-full bg-[#1DB954] px-4 py-2 text-sm font-medium text-black"
            >
              Envoyer
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
