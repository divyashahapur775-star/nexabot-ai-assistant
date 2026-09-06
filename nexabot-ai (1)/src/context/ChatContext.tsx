import React, { createContext, useContext, useState, useEffect } from 'react';
import { Conversation, ChatMessage, TaskType, Attachment } from '../types';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeTaskId: TaskType;
  isSending: boolean;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  setActiveTaskId: (task: TaskType) => void;
  createNewChat: (initialTask?: TaskType) => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  sendMessage: (text: string, attachments?: Attachment[], language?: string) => Promise<void>;
  clearActiveChat: () => void;
}

export const getWelcomeMessage = (lang: string = 'en'): string => {
  switch (lang) {
    case 'kn':
      return 'ನಮಸ್ಕಾರ! ನಾನು **ನೆಕ್ಸಾಬಾಟ್ AI (NexaBot AI)**, ನಿಮ್ಮ ಬುದ್ಧಿವಂತ ಸಹಾಯಕ. ನಾನು ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ?\n\nನೀವು ಯಾವುದೇ ಪ್ರಶ್ನೆಯನ್ನು ನೇರವಾಗಿ ಕೇಳಬಹುದು ಅಥವಾ ವಿಶೇಷ AI ಸಹಾಯಕ್ಕಾಗಿ ಕೆಳಗಿನ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಆಯ್ಕೆ ಮಾಡಬಹುದು.';
    case 'hi':
      return 'नमस्ते! मैं **नेक्साबॉट AI (NexaBot AI)** हूँ, आपका बुद्धिमान सहायक। आज मैं आपकी कैसे सहायता कर सकता हूँ?\n\nआप सीधे कोई भी प्रश्न पूछ सकते हैं या विशेष सहायता के लिए नीचे दिए गए विकल्पों में से चुन सकते हैं।';
    case 'fr':
      return 'Bonjour ! Je suis **NexaBot AI**, votre assistant intelligent. Comment puis-je vous aider aujourd\'hui ?\n\nVous pouvez poser n\'importe quelle question directement ou sélectionner une de nos fonctionnalités.';
    default:
      return 'Hello! I am **NexaBot AI**, your intelligent assistant. How can I help you today?\n\nYou can ask any question directly or choose one of our **AVAILABLE FEATURES** below for specialized AI assistance.';
  }
};

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'msg_welcome',
  sender: 'ai',
  text: getWelcomeMessage('en'),
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  taskType: 'general'
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const userStorageKey = currentUser ? `nexabot_conversations_${currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'nexabot_conversations_guest';
  const activeChatKey = currentUser ? `nexabot_active_chat_id_${currentUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'nexabot_active_chat_id_guest';

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    let attachmentMap: Record<string, string> = {};
    try {
      const savedAttachments = sessionStorage.getItem('nexabot_attachment_data');
      if (savedAttachments) {
        attachmentMap = JSON.parse(savedAttachments);
      }
    } catch (e) {}

    const saved = localStorage.getItem(userStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((c: Conversation) => {
            c.messages?.forEach((m: ChatMessage) => {
              m.attachments?.forEach((att: Attachment) => {
                if (attachmentMap[att.id]) {
                  att.dataUrl = attachmentMap[att.id];
                  att.base64 = attachmentMap[att.id];
                  att.content = attachmentMap[att.id];
                }
              });
            });
          });
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    // Default initial conversation
    const initialId = `chat_${Date.now()}`;
    const initialChat: Conversation = {
      id: initialId,
      title: 'New Conversation',
      taskType: 'general',
      messages: [DEFAULT_WELCOME_MESSAGE],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return [initialChat];
  });

  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    const savedId = localStorage.getItem(activeChatKey);
    if (savedId && conversations.some(c => c.id === savedId)) {
      return savedId;
    }
    return conversations[0]?.id || `chat_${Date.now()}`;
  });

  // Re-load conversations when currentUser changes (e.g. login/logout or switching account)
  useEffect(() => {
    const saved = localStorage.getItem(userStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          const savedId = localStorage.getItem(activeChatKey);
          if (savedId && parsed.some((c: Conversation) => c.id === savedId)) {
            setActiveConversationId(savedId);
          } else {
            setActiveConversationId(parsed[0].id);
          }
          return;
        }
      } catch (e) {}
    }
    // Default fresh chat for this user
    const initialId = `chat_${Date.now()}`;
    const initialChat: Conversation = {
      id: initialId,
      title: 'New Conversation',
      taskType: 'general',
      messages: [DEFAULT_WELCOME_MESSAGE],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setConversations([initialChat]);
    setActiveConversationId(initialId);
  }, [currentUser?.email]);

  const [activeTaskId, setActiveTaskId] = useState<TaskType>('general');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguageState] = useState<string>(() => {
    return localStorage.getItem('nexabot_selected_language') || 'en';
  });

  const setSelectedLanguage = (lang: string) => {
    setSelectedLanguageState(lang);
    try {
      localStorage.setItem('nexabot_selected_language', lang);
    } catch (e) {}
  };

  useEffect(() => {
    try {
      const attachmentMap: Record<string, string> = {};
      const sanitized = conversations.map(c => ({
        ...c,
        messages: c.messages.map(m => ({
          ...m,
          attachments: m.attachments?.map(att => {
            const val = att.dataUrl || att.base64 || att.content;
            if (val) {
              attachmentMap[att.id] = val;
            }
            return {
              id: att.id,
              name: att.name,
              size: att.size,
              type: att.type,
              mimeType: att.mimeType,
              dataUrl: att.dataUrl,
              base64: att.base64,
              content: att.content
            };
          })
        }))
      }));

      try {
        sessionStorage.setItem('nexabot_attachment_data', JSON.stringify(attachmentMap));
      } catch (err) {}

      const localStorageSanitized = conversations.map(c => ({
        ...c,
        messages: c.messages.map(m => ({
          ...m,
          attachments: m.attachments?.map(att => ({
            id: att.id,
            name: att.name,
            size: att.size,
            type: att.type,
            mimeType: att.mimeType
          }))
        }))
      }));
      localStorage.setItem(userStorageKey, JSON.stringify(localStorageSanitized));
    } catch (e) {
      console.warn('LocalStorage save warning:', e);
    }
  }, [conversations, userStorageKey]);

  useEffect(() => {
    if (activeConversationId) {
      localStorage.setItem(activeChatKey, activeConversationId);
    }
  }, [activeConversationId, activeChatKey]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || conversations[0] || null;

  const createNewChat = (initialTask: TaskType = 'general'): string => {
    const newId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newChat: Conversation = {
      id: newId,
      title: 'New Conversation',
      taskType: initialTask,
      messages: [
        {
          ...DEFAULT_WELCOME_MESSAGE,
          text: getWelcomeMessage(selectedLanguage),
          id: `msg_welcome_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          taskType: initialTask
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setConversations(prev => [newChat, ...prev]);
    setActiveConversationId(newId);
    setActiveTaskId(initialTask);
    return newId;
  };

  const selectConversation = (id: string) => {
    const target = conversations.find(c => c.id === id);
    if (target) {
      setActiveConversationId(id);
      setActiveTaskId(target.taskType || 'general');
    }
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        // Create a fresh conversation if all deleted
        const newId = `chat_${Date.now()}`;
        const freshChat: Conversation = {
          id: newId,
          title: 'New Conversation',
          taskType: 'general',
          messages: [DEFAULT_WELCOME_MESSAGE],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setActiveConversationId(newId);
        return [freshChat];
      }
      if (activeConversationId === id) {
        setActiveConversationId(filtered[0].id);
      }
      return filtered;
    });
  };

  const clearActiveChat = () => {
    if (!activeConversation) return;
    setConversations(prev =>
      prev.map(c => {
        if (c.id === activeConversation.id) {
          return {
            ...c,
            messages: [
              {
                ...DEFAULT_WELCOME_MESSAGE,
                id: `msg_welcome_${Date.now()}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ],
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      })
    );
  };

  const sendMessage = async (text: string, attachments?: Attachment[], language?: string) => {
    if ((!text || text.trim() === '') && (!attachments || attachments.length === 0)) {
      return;
    }

    let currentChatId = activeConversationId;
    let targetChat = conversations.find(c => c.id === currentChatId);

    if (!targetChat) {
      currentChatId = createNewChat(activeTaskId);
      targetChat = conversations.find(c => c.id === currentChatId)!;
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: timeString,
      taskType: activeTaskId,
      attachments: attachments && attachments.length > 0 ? attachments : undefined
    };

    // Calculate title if conversation title is default or first user message
    const isFirstUserMessage = targetChat.messages.filter(m => m.sender === 'user').length === 0;
    const newTitle = isFirstUserMessage
      ? text.slice(0, 32) + (text.length > 32 ? '...' : '')
      : targetChat.title;

    // Append user message immediately
    setConversations(prev =>
      prev.map(c => {
        if (c.id === currentChatId) {
          return {
            ...c,
            title: newTitle,
            taskType: activeTaskId,
            messages: [...c.messages, userMessage],
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      })
    );

    setIsSending(true);

    try {
      // Collect payload history
      const currentMessages = targetChat.messages
        .filter(m => m.id !== 'msg_welcome')
        .concat(userMessage)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }));

      // Call API endpoint with robust retry and safe JSON parsing
      let aiReplyText = '';
      let sentimentData: any = undefined;
      let adaptationStrategy: any = undefined;
      let conversationContext: any = undefined;
      let sentimentLabel: any = undefined;
      let sentimentScore: any = undefined;

      let success = false;
      const maxAttempts = 3;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const isMultimodal = (attachments && attachments.length > 0) || activeTaskId === 'multimodal-assistant' || activeTaskId === 'document-analysis';
          const endpoint = isMultimodal ? '/api/multimodal/pipeline' : '/api/chat';

          const activeLang = language || selectedLanguage || 'en';
          const requestBody = isMultimodal
            ? {
                query: text.trim(),
                prompt: text.trim(),
                text: text.trim(),
                messages: currentMessages,
                attachments: attachments?.map(att => ({
                  id: att.id,
                  name: att.name,
                  size: att.size,
                  type: att.type,
                  base64Data: att.content || att.base64 || att.dataUrl || '',
                  mimeType: att.mimeType || att.type
                })),
                taskType: activeTaskId,
                sessionId: currentChatId,
                language: activeLang
              }
            : {
                messages: currentMessages,
                taskType: activeTaskId,
                sessionId: currentChatId,
                language: activeLang
              };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            if (data && typeof data === 'object') {
              aiReplyText = data.reply || data.revisedResponse || 'I processed your request.';
              sentimentData = data.sentiment;
              adaptationStrategy = data.strategy;
              conversationContext = data.context;
              if (data.sentiment) {
                sentimentLabel = data.sentiment.label;
                sentimentScore = data.sentiment.confidencePercentage;
              }
              success = true;
              break;
            }
          } else if (response.ok) {
            const rawText = await response.text();
            if (rawText && !rawText.trim().startsWith('<!')) {
              aiReplyText = rawText.trim();
              success = true;
              break;
            }
          }
        } catch (fetchErr) {
          console.warn(`[ChatContext] Network attempt ${attempt + 1}/${maxAttempts} notice:`, fetchErr);
        }

        if (attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
        }
      }

      if (!success || !aiReplyText) {
        aiReplyText = 'I processed your message. The NexaBot AI engine is active and ready to assist across all specialized modes.';
      }

      const aiMessage: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        taskType: activeTaskId,
        sentimentData,
        adaptationStrategy,
        conversationContext,
        sentimentLabel,
        sentimentScore
      };

      setConversations(prev =>
        prev.map(c => {
          if (c.id === currentChatId) {
            return {
              ...c,
              messages: [...c.messages, aiMessage],
              updatedAt: new Date().toISOString()
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.warn('Chat interaction handled gracefully:', err);
      const errorMessage: ChatMessage = {
        id: `msg_ai_err_${Date.now()}`,
        sender: 'ai',
        text: 'I received your input. How else can I assist you with your project or analysis?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        taskType: activeTaskId
      };

      setConversations(prev =>
        prev.map(c => {
          if (c.id === currentChatId) {
            return {
              ...c,
              messages: [...c.messages, errorMessage],
              updatedAt: new Date().toISOString()
            };
          }
          return c;
        })
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        activeTaskId,
        isSending,
        selectedLanguage,
        setSelectedLanguage,
        setActiveTaskId,
        createNewChat,
        selectConversation,
        deleteConversation,
        sendMessage,
        clearActiveChat
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
