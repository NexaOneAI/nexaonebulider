export interface SuggestedPrompt {
  id: string;
  emoji: string;
  title: string;
  prompt: string;
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'saas-landing',
    emoji: '🚀',
    title: 'Landing para mi SaaS',
    prompt:
      'Crea una landing page moderna para un SaaS llamado "Acme" con hero, sección de features, pricing con 3 planes, testimonios y CTA final. Diseño dark, gradientes sutiles y tipografía moderna.',
  },
  {
    id: 'restaurant',
    emoji: '🍽️',
    title: 'Web para restaurante',
    prompt:
      'Crea una página web elegante para un restaurante con sección de menú destacado, galería de platillos, reservaciones y contacto. Estilo cálido y minimalista.',
  },
  {
    id: 'portfolio',
    emoji: '💼',
    title: 'Portafolio personal',
    prompt:
      'Crea un portafolio personal de diseñador web con hero animado, sección "sobre mí", grid de proyectos con hover, servicios y formulario de contacto. Estilo creativo y profesional.',
  },
  {
    id: 'todo-app',
    emoji: '✅',
    title: 'App de tareas',
    prompt:
      'Crea una aplicación de gestión de tareas con lista, agregar, marcar como completada, eliminar y filtros (todas/activas/completadas). UI limpia tipo Notion.',
  },
];