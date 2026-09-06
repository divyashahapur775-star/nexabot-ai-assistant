import { FeatureCardInfo } from '../types';

export const FEATURES_DATA: FeatureCardInfo[] = [
  {
    number: 'Additional',
    id: 'personal-assistant',
    title: 'Personal Assistant',
    description: 'Get help with everyday questions, planning, writing and productivity.',
    iconName: 'Bot',
    badge: 'Productivity',
    color: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-500/10 via-indigo-500/5 to-transparent',
    examplePrompt: 'Help me plan a productive 5-day daily routine for learning Python and Data Science.'
  },
  {
    number: 'Task 01',
    id: 'sentiment-analysis',
    title: 'Sentiment Analysis',
    description: 'Analyze text and understand emotions, opinions and sentiment.',
    iconName: 'Activity',
    badge: 'NLP & Insights',
    color: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    examplePrompt: 'Analyze sentiment: "The new platform launch exceeded our expectations! Our users love the intuitive design."'
  },
  {
    number: 'Task 02',
    id: 'medical-qa',
    title: 'Medical Q&A',
    description: 'Explore medical information and answers using trusted knowledge.',
    iconName: 'Stethoscope',
    badge: 'Health Intelligence',
    color: 'from-rose-500 to-pink-600',
    bgGradient: 'from-rose-500/10 via-pink-500/5 to-transparent',
    examplePrompt: 'What are the general guidelines for maintaining healthy cardiovascular endurance and sleep hygiene?'
  },
  {
    number: 'Task 03',
    id: 'knowledge-base',
    title: 'Knowledge Base',
    description: 'Search and interact with a dynamic knowledge base intelligently.',
    iconName: 'BookOpen',
    badge: 'RAG & Retrieval',
    color: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-500/10 via-purple-500/5 to-transparent',
    examplePrompt: 'Explain how Convolutional Neural Networks work in computer vision with a step-by-step technical breakdown.'
  },
  {
    number: 'Task 04',
    id: 'domain-expert',
    title: 'Paper Analysis',
    description: 'Analyze arXiv cs.CL papers and retrieve deep technical insights.',
    iconName: 'FileText',
    badge: 'Research AI',
    color: 'from-cyan-500 to-blue-600',
    bgGradient: 'from-cyan-500/10 via-blue-500/5 to-transparent',
    examplePrompt: 'What are the most recent cs.CL arXiv papers about attention mechanisms?'
  },
  {
    number: 'Task 05',
    id: 'multimodal-assistant',
    title: 'Image Analysis',
    description: 'Analyze images and multimodal data with vision capabilities.',
    iconName: 'Image',
    badge: 'Vision AI',
    color: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    examplePrompt: 'Analyze this image and describe the key visual elements and composition.'
  }
];
