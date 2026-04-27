import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSocket } from "../lib/socket";
import { api } from "../lib/api";
import type { Conversation, ConnectionStatus, Lead, Message } from "../lib/types";

export interface RealtimeState {
  whatsapp: { status: ConnectionStatus; qr?: string | null };
  services: { ai: boolean; stt: boolean; tts: boolean; queue: boolean };
  conversations: Conversation[];
  messagesByConv: Record<string, Message[]>;
  thinking: Record<string, boolean>;
  selectedId: string | null;
  loadingMessages: boolean;
  errors: { id: string; message: string }[];
}

export const useRealtime = () => {
  const [whatsapp, setWhatsapp] = useState<RealtimeState["whatsapp"]>({
    status: "connecting",
    qr: null,
  });
  const [services, setServices] = useState<RealtimeState["services"]>({
    ai: false,
    stt: false,
    tts: false,
    queue: false,
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({});
  const [thinking, setThinking] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [errors, setErrors] = useState<{ id: string; message: string }[]>([]);
  const loadedRef = useRef<Set<string>>(new Set());

  const upsertConversation = useCallback((conv: Conversation) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conv.id);
      if (idx === -1) return [conv, ...prev];
      const merged = { ...prev[idx], ...conv };
      const next = [...prev];
      next.splice(idx, 1);
      return [merged, ...next];
    });
  }, []);

  const upsertMessage = useCallback((message: Message) => {
    setMessagesByConv((prev) => {
      const list = prev[message.conversationId] || [];
      const exists = list.some((m) => m.id === message.id);
      const next = exists
        ? list.map((m) => (m.id === message.id ? { ...m, ...message } : m))
        : [...list, message];
      return { ...prev, [message.conversationId]: next };
    });
  }, []);

  // Initial load — runs once per mount (mounted only when authenticated)
  useEffect(() => {
    api
      .status()
      .then((s) => {
        setWhatsapp(s.whatsapp as RealtimeState["whatsapp"]);
        setServices(s.services);
      })
      .catch(() => {
        /* network may be down; socket reconnects */
      });
    api
      .listConversations()
      .then((list) => {
        setConversations(list);
        if (list.length > 0) {
          setSelectedId((prev) => prev ?? list[0].id);
        }
      })
      .catch(() => {
        /* noop */
      });
  }, []);

  // Load messages when selecting a conversation
  useEffect(() => {
    if (!selectedId) return;
    if (loadedRef.current.has(selectedId)) return;
    setLoadingMessages(true);
    api
      .getMessages(selectedId)
      .then((msgs) => {
        loadedRef.current.add(selectedId);
        setMessagesByConv((prev) => ({ ...prev, [selectedId]: msgs }));
      })
      .finally(() => setLoadingMessages(false));
  }, [selectedId]);

  // Socket subscriptions
  useEffect(() => {
    const socket = getSocket();

    const onConn = (payload: { status: ConnectionStatus; qr?: string | null }) => {
      setWhatsapp(payload);
    };
    const onReceived = (payload: { message: Message; conversation: Conversation }) => {
      upsertMessage(payload.message);
      upsertConversation(payload.conversation);
    };
    const onSent = (payload: { message: Message }) => upsertMessage(payload.message);
    const onTranscribed = (payload: { messageId: string; transcription: string }) => {
      setMessagesByConv((prev) => {
        const next = { ...prev };
        for (const cid of Object.keys(next)) {
          next[cid] = next[cid].map((m) =>
            m.id === payload.messageId ? { ...m, transcription: payload.transcription } : m,
          );
        }
        return next;
      });
    };
    const onReaction = (payload: { messageId: string; emoji: string }) => {
      setMessagesByConv((prev) => {
        const next = { ...prev };
        for (const cid of Object.keys(next)) {
          next[cid] = next[cid].map((m) =>
            m.id === payload.messageId ? { ...m, reaction: payload.emoji } : m,
          );
        }
        return next;
      });
    };
    const onThinking = (payload: { conversationId: string; on: boolean }) => {
      setThinking((prev) => ({ ...prev, [payload.conversationId]: payload.on }));
    };
    const onLead = (payload: { conversation: Conversation; lead?: Lead | null }) => {
      const conv = payload.conversation;
      if (!conv) return;
      upsertConversation({ ...conv, lead: payload.lead ?? conv.lead });
    };
    const onStatus = (payload: { conversationId: string; status: string }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === payload.conversationId ? { ...c, status: payload.status } : c)),
      );
    };
    const onError = (payload: { message: string }) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setErrors((prev) => [...prev, { id, message: payload.message }]);
      setTimeout(() => setErrors((prev) => prev.filter((e) => e.id !== id)), 6000);
    };

    socket.on("wa.connection.update", onConn);
    socket.on("wa.message.received", onReceived);
    socket.on("wa.message.sent", onSent);
    socket.on("audio.transcribed", onTranscribed);
    socket.on("wa.reaction.sent", onReaction);
    socket.on("ai.thinking", onThinking);
    socket.on("lead.updated", onLead);
    socket.on("conversation.status_changed", onStatus);
    socket.on("error", onError);

    return () => {
      socket.off("wa.connection.update", onConn);
      socket.off("wa.message.received", onReceived);
      socket.off("wa.message.sent", onSent);
      socket.off("audio.transcribed", onTranscribed);
      socket.off("wa.reaction.sent", onReaction);
      socket.off("ai.thinking", onThinking);
      socket.off("lead.updated", onLead);
      socket.off("conversation.status_changed", onStatus);
      socket.off("error", onError);
    };
  }, [upsertConversation, upsertMessage]);

  // Auto-select first conversation when arrives
  useEffect(() => {
    if (!selectedId && conversations.length > 0) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId],
  );

  const selectedMessages = useMemo(
    () => (selectedId ? messagesByConv[selectedId] || [] : []),
    [messagesByConv, selectedId],
  );

  return {
    whatsapp,
    services,
    conversations,
    messages: selectedMessages,
    selectedConversation,
    selectedId,
    setSelectedId,
    thinking: selectedId ? thinking[selectedId] || false : false,
    loadingMessages,
    errors,
  };
};
