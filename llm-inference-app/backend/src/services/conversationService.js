const FileStore = require('../database/fileStore');
const LlmService = require('./llmService');
const ToolRunner = require('../tools/toolRunner');

class ConversationService {
  static async listConversations(userId, { search = '' } = {}) {
    return FileStore.listConversations(userId, { search });
  }

  static async createConversation(userId, prompt, provider = 'ollama', model = 'llama3') {
    const title = prompt.slice(0, 50).trim() || 'New Chat';
    const conversation = await FileStore.createConversation(userId, title);
    const result = await this.sendMessage(userId, conversation.conversation_id, prompt, provider, model);
    return result.conversation;
  }

  static async getConversation(userId, conversationId) {
    const conversation = await FileStore.getConversation(userId, conversationId);
    if (!conversation) throw new Error('Conversation not found');
    return {
      conversationId: conversation.conversation_id,
      title: conversation.title,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      messages: conversation.messages.map((m) => ({
        messageId: m.message_id,
        role: m.role,
        content: m.content,
        tool: m.tool || null,
        createdAt: m.created_at
      }))
    };
  }

  static async sendMessage(userId, conversationId, prompt, provider = 'ollama', model = 'llama3') {
    const conversation = await FileStore.getConversation(userId, conversationId);
    if (!conversation) throw new Error('Conversation not found');

    await FileStore.appendMessage(userId, conversationId, { role: 'user', content: prompt });

    // Try tool calling first
    const toolResult = await ToolRunner.run(prompt);

    let assistantReply;
    let toolUsed = null;

    if (toolResult) {
      // Tool handled it — use tool result as the reply
      assistantReply = toolResult.message;
      toolUsed = toolResult.tool;
    } else {
      // No tool matched — send to LLM
      const updatedConversation = await FileStore.getConversation(userId, conversationId);
      assistantReply = await LlmService.generateReply(prompt, updatedConversation, provider, model);
    }

    const finalConversation = await FileStore.appendMessage(userId, conversationId, {
      role: 'assistant',
      content: assistantReply,
      tool: toolUsed
    });

    return {
      conversation: {
        conversationId: finalConversation.conversation_id,
        title: finalConversation.title,
        createdAt: finalConversation.created_at,
        updatedAt: finalConversation.updated_at,
        messages: finalConversation.messages.map((m) => ({
          messageId: m.message_id,
          role: m.role,
          content: m.content,
          tool: m.tool || null,
          createdAt: m.created_at
        }))
      },
      assistantReply,
      toolUsed
    };
  }

  static async deleteConversation(userId, conversationId) {
    return FileStore.deleteConversation(userId, conversationId);
  }
}

module.exports = ConversationService;
