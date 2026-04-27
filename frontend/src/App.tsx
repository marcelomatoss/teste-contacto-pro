import { useRealtime } from "./hooks/useRealtime";
import TopBar from "./components/TopBar";
import ConversationList from "./components/ConversationList";
import ChatView from "./components/ChatView";
import LeadPanel from "./components/LeadPanel";
import { QRPanel } from "./components/ConnectionStatus";
import Toaster from "./components/Toaster";

function App() {
  const {
    whatsapp,
    services,
    conversations,
    selectedId,
    setSelectedId,
    selectedConversation,
    messages,
    thinking,
    loadingMessages,
    errors,
  } = useRealtime();

  const showQR = whatsapp.status === "qr" && whatsapp.qr;

  return (
    <div className="flex h-screen flex-col">
      <TopBar status={whatsapp.status} services={services} />

      {showQR && (
        <div className="border-b border-slate-200/60 px-6 py-5">
          <div className="mx-auto max-w-3xl">
            <QRPanel qr={whatsapp.qr} />
          </div>
        </div>
      )}

      <main className="grid flex-1 grid-cols-[320px_minmax(0,1fr)_340px] overflow-hidden border-t border-slate-200/60">
        <aside className="border-r border-slate-200/70 bg-white/70 backdrop-blur-sm">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>

        <section className="overflow-hidden">
          <ChatView
            conversation={selectedConversation}
            messages={messages}
            thinking={thinking}
            loading={loadingMessages}
          />
        </section>

        <aside className="border-l border-slate-200/70">
          <LeadPanel conversation={selectedConversation} />
        </aside>
      </main>

      <Toaster errors={errors} />
    </div>
  );
}

export default App;
