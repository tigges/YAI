export { LlmAdapter } from './types.js'
export type {
  LlmProvider, LlmMessage, LlmCompleteParams, LlmStreamParams,
  LlmCompleteResult, LlmEmbedParams, LlmEmbedResult,
  LlmClassifyParams, LlmClassifyResult,
} from './types.js'
export { OpenAIProvider } from './providers/openai.js'
export { AnthropicProvider } from './providers/anthropic.js'
export { OllamaProvider, GroqProvider } from './providers/ollama.js'

import { LlmAdapter } from './types.js'
import { OpenAIProvider } from './providers/openai.js'
import { AnthropicProvider } from './providers/anthropic.js'
import { GroqProvider, OllamaProvider } from './providers/ollama.js'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'

/**
 * Instantiate the primary LLM adapter (used for chat / completion).
 * Prefers free-tier providers when no paid keys are set.
 * For per-bot model selection use `createLlmAdapterForModel` instead.
 */
export function createLlmAdapter(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): LlmAdapter {
  if (env['OPENAI_API_KEY'])    return new LlmAdapter(new OpenAIProvider(env['OPENAI_API_KEY']), env['OPENAI_MODEL'])
  if (env['ANTHROPIC_API_KEY']) return new LlmAdapter(new AnthropicProvider(env['ANTHROPIC_API_KEY']), env['ANTHROPIC_MODEL'])
  if (env['GROQ_API_KEY'])      return new LlmAdapter(new GroqProvider(env['GROQ_API_KEY']), env['GROQ_MODEL'] ?? 'llama-3.3-70b-versatile')
  if (env['GEMINI_API_KEY'])    return new LlmAdapter(new OpenAIProvider(env['GEMINI_API_KEY'], GEMINI_BASE_URL), env['GEMINI_MODEL'] ?? 'gemini-2.0-flash')
  return new LlmAdapter(new OllamaProvider(env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'), env['OLLAMA_MODEL'] ?? 'llama3.2')
}

/**
 * Route to the correct provider+model based on the model string saved in BotConfig.
 * Falls back to `createLlmAdapter()` if no provider key is available for that family.
 *
 * Model prefix → provider mapping:
 *   gemini-*         → Google AI (GEMINI_API_KEY)
 *   gpt-* / o1 / o3  → OpenAI   (OPENAI_API_KEY)
 *   claude-*         → Anthropic (ANTHROPIC_API_KEY)
 *   groq/*           → Groq      (GROQ_API_KEY)
 *   ollama/*         → Ollama    (OLLAMA_BASE_URL)
 */
export function createLlmAdapterForModel(
  model: string,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): LlmAdapter {
  if (model.startsWith('gemini-')) {
    const key = env['GEMINI_API_KEY']
    if (key) return new LlmAdapter(new OpenAIProvider(key, GEMINI_BASE_URL), model)
  }
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')) {
    const key = env['OPENAI_API_KEY']
    if (key) return new LlmAdapter(new OpenAIProvider(key), model)
  }
  if (model.startsWith('claude-')) {
    const key = env['ANTHROPIC_API_KEY']
    if (key) return new LlmAdapter(new AnthropicProvider(key), model)
  }
  if (model.startsWith('groq/')) {
    const key = env['GROQ_API_KEY']
    if (key) return new LlmAdapter(new GroqProvider(key), model.slice(5))
  }
  if (model.startsWith('ollama/')) {
    return new LlmAdapter(
      new OllamaProvider(env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'),
      model.slice(7),
    )
  }
  // Model family not recognised or required key not set — fall back to server default
  return createLlmAdapter(env)
}

/**
 * Instantiate an embedding adapter.
 * Gemini supports embeddings via its OpenAI-compatible endpoint.
 */
export function createEmbeddingAdapter(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): LlmAdapter {
  if (env['OPENAI_API_KEY'])  return new LlmAdapter(new OpenAIProvider(env['OPENAI_API_KEY']), env['OPENAI_EMBED_MODEL'] ?? 'text-embedding-3-small')
  if (env['GEMINI_API_KEY'])  return new LlmAdapter(new OpenAIProvider(env['GEMINI_API_KEY'], GEMINI_BASE_URL), 'text-embedding-004')
  return new LlmAdapter(new OllamaProvider(env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'), env['OLLAMA_EMBED_MODEL'] ?? 'nomic-embed-text')
}
