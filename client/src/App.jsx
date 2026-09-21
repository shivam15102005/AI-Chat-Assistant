import { useMemo } from 'react';

import Sidebar from './components/Sidebar.jsx';
import ChatWindow from './components/ChatWindow.jsx';

import { useChat } from './hooks/useChat.js';

export default function App() {
  const chat = useChat();

  const activeConversation = useMemo(
    () =>
      chat.conversations.find(
        (conversation) =>
          conversation.id === chat.activeConversationId
      ),
    [
      chat.activeConversationId,
      chat.conversations,
    ]
  );

  if (chat.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

          <p className="mt-3 text-sm text-slate-500">
            Loading your conversations…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#f7f8fb] text-slate-900">

      <Sidebar
        conversations={chat.conversations}
        activeId={chat.activeConversationId}
        onSelect={chat.loadConversation}
        onNewChat={chat.startNewChat}
        onDelete={chat.deleteChat}
        mobileOpen={chat.mobileSidebarOpen}
        onClose={() =>
          chat.setMobileSidebarOpen(false)
        }
      />

      <ChatWindow
        conversation={activeConversation}
        messages={chat.messages}
        input={chat.input}
        setInput={chat.setInput}
        tone={chat.tone}
        setTone={chat.setTone}
        isStreaming={chat.isStreaming}
        onSend={chat.sendMessage}
        onNewChat={chat.startNewChat}
        onOpenSidebar={() =>
          chat.setMobileSidebarOpen(true)
        }
        error={chat.error}
      />

    </div>
  );
}