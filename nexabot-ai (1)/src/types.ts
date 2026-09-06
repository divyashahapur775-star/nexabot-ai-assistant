export type TaskType =
  | 'general'
  | 'personal-assistant'
  | 'sentiment-analysis'
  | 'medical-qa'
  | 'document-analysis'
  | 'knowledge-base'
  | 'domain-expert'
  | 'multimodal-assistant';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  dataUrl?: string;
  base64?: string;
  mimeType?: string;
}

export interface EmotionDistribution {
  joy: number;
  frustration: number;
  neutrality: number;
  urgency: number;
  satisfaction: number;
}

export interface SentimentAnalysisData {
  label: 'Positive' | 'Negative' | 'Neutral';
  polarityScore: number;
  confidenceScore: number;
  confidencePercentage: number;
  emotionDistribution: EmotionDistribution;
  keyPhrases: string[];
}

export interface AdaptationStrategyData {
  tone: string;
  shouldEscalate: boolean;
  escalationLevel: 'None' | 'Medium' | 'High';
  escalationReason: string | null;
  actionRecommendation: string;
}

export interface ConversationSentimentContextData {
  sessionId?: string;
  turnIndex: number;
  trend: 'Improving' | 'Declining' | 'Stable' | 'Initial';
  averagePolarity: number;
  escalationTriggered: boolean;
  sentimentDelta: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  taskType?: TaskType;
  attachments?: Attachment[];
  sentimentScore?: number;
  sentimentLabel?: 'Positive' | 'Negative' | 'Neutral' | 'Mixed';
  sentimentData?: SentimentAnalysisData;
  adaptationStrategy?: AdaptationStrategyData;
  conversationContext?: ConversationSentimentContextData;
}

export interface Conversation {
  id: string;
  title: string;
  taskType: TaskType;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface FeatureCardInfo {
  number: string;
  id: TaskType;
  title: string;
  description: string;
  iconName: string;
  badge: string;
  color: string;
  bgGradient: string;
  examplePrompt: string;
}
