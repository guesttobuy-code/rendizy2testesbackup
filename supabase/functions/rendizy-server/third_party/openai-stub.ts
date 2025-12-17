// Local stub to avoid fetching OpenAI from the internet during local serve.
// Provides minimal shape so any import "openai" resolves without network.
export default class OpenAI {
  constructor(_: unknown) {}
}

// Optional: basic client-like shape if needed.
export class OpenAIClient {
  constructor(_: unknown) {}
}
