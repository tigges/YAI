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

/** Instantiate the primary LLM adapter (used for chat / completion). */
export function createLlmAdapter(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): LlmAdapter {
  if (env['OPENAI_API_KEY']) return new LlmAdapter(new OpenAIProvider(env['OPENAI_API_KEY']), env['OPENAI_MODEL'])
  if (env['ANTHROPIC_API_KEY']) return new LlmAdapter(new AnthropicProvider(env['ANTHROPIC_API_KEY']), env['ANTHROPIC_MODEL'])
  if (env['GROQ_API_KEY']) return new LlmAdapter(new GroqProvider(env['GROQ_API_KEY']), env['GROQ_MODEL'] ?? 'llama-3.1-8b-instant')
  return new LlmAdapter(new OllamaProvider(env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'), env['OLLAMA_MODEL'] ?? 'llama3.2')
}

/**
 * Instantiate an embedding adapter.
 *
 * Anthropic doesn't expose an embeddings API, so when the main provider is Anthropic
 * we fall back to OpenAI embeddings (if OPENAI_API_KEY is set) or Ollama.
 * Embeddings are only needed for RAG knowledge search.
 */
export function createEmbeddingAdapter(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): LlmAdapter {
  if (env['OPENAI_API_KEY']) return new LlmAdapter(new OpenAIProvider(env['OPENAI_API_KEY']), env['OPENAI_EMBED_MODEL'] ?? 'text-embedding-3-small')
  // Groq doesn't offer embeddings; fall through to Ollama
  return new LlmAdapter(new OllamaProvider(env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'), env['OLLAMA_EMBED_MODEL'] ?? 'nomic-embed-text')
}
