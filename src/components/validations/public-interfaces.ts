import {
  BaseState,
  BasicAnswerTypes,
  BasicHandable,
  CurrentSessionFactory,
  EntityDictionary,
  PlatformGenerator,
  State,
  Transitionable,
} from "assistant-source";
import { Configuration } from "./private-interfaces";

/** All needed information about the validation */
export interface HookContext<Strategy extends ValidationStrategy.Prompt | ValidationStrategy.Confirmation> {
  /** Which intent shall we call after confirmation or prompting was successful? */
  intent: string;

  /** Which state shall we redirect to after confirmation or prompting was successful? */
  state: string;

  /** List of arguments to append to state#intent call */
  redirectArguments: any[];

  /** Validation settings. Our BeforeIntentHook needs this to decide which state to use for validation */
  validation: Strategy;
}

export namespace ValidationStrategy {
  /** Use this to prompt for a specific entity */
  // tslint:disable-next-line:no-shadowed-variable
  export interface Prompt {
    /** If type is set to prompt, user wants to prompt for a specific entity */
    type: "prompt";

    /** The entity to prompt for */
    neededEntity: string;
  }

  /** Use this to confirm = force the user to choose between either yes or no */
  export interface Confirmation {
    /** If type is set to confirm, only "yes" or "no" is allowed as answer. The result will be stored in the last argument of the intent method call */
    type: "confirmation";
  }
}

export namespace DecoratorOptions {
  /** Metadata options of @needsEntitiy decorator */
  export interface NeedsEntity {
    /** Prompt state name to use or undefined if user wants to use default prompt state */
    promptStateName?: string;

    /** Entities to prompt for */
    entities: string[];
  }

  /** Metadata options of @needsConfirmation decorator */
  export interface Confirmation {
    /** Name of confirmation state to use */
    confirmationStateName?: string;
  }
}

export namespace InitializerOptions {
  /** Options used in all InitializerOptions */
  interface BaseOptions {
    /** Additional arguments to pass, will be re-passed to state/intent call */
    redirectArguments: any[];

    /** If set to false, no invoke message will be emitted */
    tellInvokeMessage: boolean;
  }

  /** Options used in {@link ValidationsInitializer#initializePrompt} */
  export interface Prompt extends BaseOptions {
    /** Name of prompt state to use, if not given, uses default prompt state */
    promptStateName: string;
  }

  /** Options used in {@link ValidationsInitializer#initializeConfirmation} */
  export interface Confirmation extends BaseOptions {
    /** Name of custom confirmation state to use. If not given, uses default confirmation state. */
    confirmationStateName: string;
  }
}

/** Session keys used in assistant-validations */
export const sessionKeys = {
  /** Session keys used for prompting */
  prompt: {
    /** Key holding information about all entities in store before prompting for a new one */
    previousEntities: "entities:currentPrompt:previousEntities",
  },
  /**
   * Session key used for saving basic information about the validation context, e.g. state and intent where a validation decorator is used.
   * Stored before making the transition by {@link BaseTransition}
   */
  context: "assistant-validations-context",
};

/**
 * Requirements you need to use the PromptMixin in one of your prompt states.
 * To fulfill them, add a class in your class hierarchy below BaseState and add these parameters to your constructor.
 * In your class using the PromptState mixin, just inject all of these requirements.
 * You find an example in the assistant-validations README.
 */
export interface PromptStateMixinRequirements extends State.Required {
  /** The current entitiy dictionary, injectable via {@link injectionNames.current.entityDictionary} */
  entities: EntityDictionary;

  /** The current session factory, injectable via {@link injectionNames.current.sessionFactory} */
  sessionFactory: CurrentSessionFactory;

  /** Your entity mappings, injectable via {@link injectionNames.userEntityMappings} */
  mappings: PlatformGenerator.EntityMapping;
}

/**
 * Interface describing what you get when applying PromptMixin to one of your states
 */
export interface PromptStateMixinInstance {
  /**
   * Called as an state entrance from promptFactory.
   * @param machine Transitionable interface
   * @param tellInvokeMessage If set to true, the invoke prompt message will be returned to user
   */
  invokeGenericIntent(machine: Transitionable, tellInvokeMessage?: boolean, ...additionalArgs: any[]): Promise<void>;

  /**
   * Intent to be called if there is an answer. Uses entityIsContained and switchEntityStorage to check if
   * an entity is given and to store the new entity into entity store
   */
  answerPromptIntent(machine: Transitionable, ...additionalArgs: any[]): Promise<void>;

  /**
   * Checks if a named entity is contained in the current request
   * @param entityType Type of entity which is stored in the hook context, derived from your config/components.ts
   */
  entityIsContained(entityType: string): boolean;

  /**
   * Changes the key of stored entity item: From this.entities.get("entityType") to this.entities.get("entityName")
   * @param entityType Type of entity, which is the current key in this.entities
   * @param entityName Name of entity, which is the new key in this.entities
   */
  switchEntityStorage(entityType: string, entityName: string): void;

  helpGenericIntent(machine: Transitionable, ...additionalArgs: any[]): Promise<void>;

  cancelGenericIntent(machine: Transitionable, ...additionalArgs: any[]): Promise<void>;

  /* 
  * Checks if entity is contained in this request, although it is unhandledIntent. 
  * If so, redirects to answerPromptIntent instead of reprompting 
  */
  unhandledGenericIntent(machine: Transitionable, ...additionalArgs: any[]): Promise<void>;

  stopGenericIntent(machine: Transitionable, ...additionalArgs: any[]): Promise<void>;

  /**
   * Unserializes hook context and prompts for the entity
   */
  unserializeAndPrompt(): Promise<void>;

  /**
   * Returns entity type by its name
   * @param name name of entity
   */
  getEntityType(name: string): string;

  /** Stores all entities currently present in entity dictionary into session. */
  storeCurrentEntitiesToSession(): Promise<void>;

  /** Opposite of storeCurrentEntitiesToSession() */
  applyStoredEntities(): Promise<void>;

  /** Get the translation convention which represents the lookup string under which the translations for the prompt state are found. */
  getTranslationConvention(): Promise<string>;
}

/**
 * Requirements you need to use the ConfirmationMixin in one of your confirmation states.
 * To fulfill them, add a class in your class hierarchy below BaseState and add these parameters to your constructor.
 * In your class using the ConfirmationState mixin, just inject all of these requirements.
 * You find an example in the assistant-validations README.
 */
export interface ConfirmationStateMixinRequirements extends State.Required {
  /** The current session factory, injectable via {@link injectionNames.current.sessionFactory} */
  sessionFactory: CurrentSessionFactory;
}

/**
 * Interface describing what you get when applying ConfirmationMixin to one of your states
 */
export interface ConfirmationStateMixinInstance {
  /**
   * Entrance point of the confirmationState, called from validations-initializer
   * @param machine Transitionable interface
   * @param tellInvokeMessage If true, an invoke Message will be returned to the user. Default: true
   */
  invokeGenericIntent(machine: Transitionable, tellInvokeMessage?: boolean, ...additionalArgs: any[]): Promise<void>;

  /** Handle a yes intent from the user by transitioning to the given state and intent, that was specified by the decorator. */
  yesGenericIntent(machine: Transitionable, ...additionalArgs: any[]): Promise<void>;

  /** Handle a no intent from the user by transitioning to the given state and intent, that was specified by the decorator. */
  noGenericIntent(machine: Transitionable, ...additionalArgs: any[]): Promise<void>;

  /** Handle a help intent from the user by prompting. */
  helpGenericIntent(machine: Transitionable, ...additionalArgs: any[]): Promise<void>;

  /** Handle a unhandled intent from the user by prompting. */
  unhandledGenericIntent(machine: Transitionable, ...additionalArgs: any[]): Promise<void>;

  /** Get the translation convention which represents the lookup string under which the translations for the confirmation state are found. */
  getTranslationConvention(): Promise<string>;
}

/**
 * Requirements needed to be able to use the CommonFunctionsMixin. Use this mixin inside of another mixin to get availability
 * to several useful functions, e.g. unserializeHook.
 */
export interface CommonFunctionsInstanceRequirements extends BaseState<BasicAnswerTypes, BasicHandable<BasicAnswerTypes>> {
  /** The current session factory, injectable via {@link injectionNames.current.sessionFactory} */
  sessionFactory: CurrentSessionFactory;
}

/**
 * Interface of the CommonFunctionsMixin describing the available functions from this mixin
 */
export interface CommonFunctionsMixinInstance {
  /**
   * Unserializes hook context
   */
  unserializeHookContext<Strategy extends ValidationStrategy.Confirmation | ValidationStrategy.Prompt>(): Promise<HookContext<Strategy>>;

  /**
   * Gives options for the logger
   */
  getLoggerOptions(): { component: string };

  /**
   * Create message when invoking the state together with a log message
   * @param loggerMessage message to write to the debug logger
   * @param suggestionChipsLookupString lookupString containing the information where to find the suggestionChips translation
   * @param translationArgs additional arguments for the translation helper
   */
  handleInvokeMessage(loggerMessage: string, suggestionChipsLookupString?: string, ...translationArgs: any[]);

  /**
   * Sets suggestionChips if the feature is available and they can be found
   * @param lookupString lookupString containing the information where to find the suggestionChips translation
   */
  setSuggestionChips(lookupString?: string);
}

/** Result of the confirmation. Will be passed as the last argument of your intent method. */
export interface ConfirmationResult {
  /** Internal symbol (equals {@link confirmationResultIdentifier}) used to identify this argument from all possible arguments of an intent method */
  returnIdentifier: symbol;

  /** True if user confirmed, false otherwise */
  confirmed: boolean;
}

/** Internal symbol to identify a confirmation result argument. See also {@link ConfirmationResult}. */
export const confirmationResultIdentifier = Symbol("ConfigurationResult.returnIdentifier");

/** Configuration of validations component */
export interface ValidationsConfiguration extends Partial<Configuration.Defaults>, Configuration.Required {}

/** Property describing the configuration of the validations component */
export interface ValidationsConfigurationAttribute {
  validations?: ValidationsConfiguration;
}
