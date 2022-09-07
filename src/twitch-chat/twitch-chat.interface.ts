import type { RefreshingAuthProvider } from '@twurple/auth/lib';
import type { ChatClient } from '@twurple/chat/lib';

export type TokenData = ConstructorParameters<typeof RefreshingAuthProvider>[1];
export type OnMessage = Parameters<ChatClient['onMessage']>[0];
export type OnAction = Parameters<ChatClient['onAction']>[0];
