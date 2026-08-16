import {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
  RoleSelectMenuInteraction,
  ChannelSelectMenuInteraction,
  MentionableSelectMenuInteraction
} from 'discord.js';

export type AnySelectMenuInteraction =
  | StringSelectMenuInteraction
  | UserSelectMenuInteraction
  | RoleSelectMenuInteraction
  | ChannelSelectMenuInteraction
  | MentionableSelectMenuInteraction;

export interface SlashCommand {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  category?: string;
  requiredPermissions?: string[];
  cooldown?: number; // em segundos
  execute: (interaction: ChatInputCommandInteraction) => Promise<void | any>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void | any>;
}

export interface BaseInteractionHandler {
  customId: string | RegExp;
  requiredPermissions?: string[];
  execute: (...args: any[]) => Promise<void | any>;
}

export interface ButtonInteractionHandler extends BaseInteractionHandler {
  execute: (interaction: ButtonInteraction) => Promise<void | any>;
}

export interface SelectMenuInteractionHandler extends BaseInteractionHandler {
  execute: (interaction: AnySelectMenuInteraction) => Promise<void | any>;
}

export interface ModalInteractionHandler extends BaseInteractionHandler {
  execute: (interaction: ModalSubmitInteraction) => Promise<void | any>;
}

export interface EventListener {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void | any>;
}
