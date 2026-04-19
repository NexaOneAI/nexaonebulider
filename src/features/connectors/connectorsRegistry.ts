/**
 * Catálogo estático de conectores disponibles para el usuario final.
 * Equivalente al panel "Connectors" de Lovable.
 *
 * Cada conector declara los secretos que el proyecto necesita para
 * funcionar. La verificación real se hace contra la lista de secretos
 * configurados en el proyecto (edge functions side).
 */
import type { LucideIcon } from 'lucide-react';
import {
  CreditCard,
  Mail,
  MessageSquare,
  Cloud,
  Bot,
  Brain,
  Sparkles,
  Database,
} from 'lucide-react';

export interface Connector {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'payments' | 'email' | 'ai' | 'storage' | 'messaging';
  secretNames: string[];
  docsUrl?: string;
}

export const CONNECTORS: Connector[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Cobros con tarjeta, suscripciones y checkouts.',
    icon: CreditCard,
    category: 'payments',
    secretNames: ['STRIPE_SECRET_KEY'],
    docsUrl: 'https://stripe.com/docs/keys',
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    description: 'Pagos en México, Argentina y LatAm.',
    icon: CreditCard,
    category: 'payments',
    secretNames: ['MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_WEBHOOK_SECRET'],
  },
  {
    id: 'resend',
    name: 'Resend',
    description: 'Envío de emails transaccionales con dominio propio.',
    icon: Mail,
    category: 'email',
    secretNames: ['RESEND_API_KEY'],
    docsUrl: 'https://resend.com/api-keys',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-5 y embeddings con tu propia API key.',
    icon: Bot,
    category: 'ai',
    secretNames: ['OPENAI_API_KEY'],
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude 3.5 Sonnet, Opus y Haiku con tu API key.',
    icon: Brain,
    category: 'ai',
    secretNames: ['ANTHROPIC_API_KEY'],
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 2.5 Pro/Flash con tu propia API key de Google AI.',
    icon: Sparkles,
    category: 'ai',
    secretNames: ['GEMINI_API_KEY'],
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'grok',
    name: 'Grok (xAI)',
    description: 'Modelos de xAI con tu API key.',
    icon: Bot,
    category: 'ai',
    secretNames: ['GROK_API_KEY'],
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS, WhatsApp y llamadas programables.',
    icon: MessageSquare,
    category: 'messaging',
    secretNames: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
  },
  {
    id: 'aws-s3',
    name: 'AWS S3',
    description: 'Storage de archivos en buckets S3.',
    icon: Cloud,
    category: 'storage',
    secretNames: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'],
  },
  {
    id: 'netlify',
    name: 'Netlify Deploy',
    description: 'Despliega tu app a un dominio público con un click.',
    icon: Database,
    category: 'storage',
    secretNames: ['NETLIFY_AUTH_TOKEN'],
    docsUrl: 'https://app.netlify.com/user/applications#personal-access-tokens',
  },
];
