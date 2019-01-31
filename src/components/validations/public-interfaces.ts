import { CurrentSessionFactory, EntityDictionary, PlatformGenerator, Transitionable } from "assistant-source";
import { Configuration } from "./private-interfaces";

/** All neded information about the validation */
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

/**
 * Creates a prompt. Needed to prompt for a parameter.
 * @param intent Name of the current intent
 * @param stateName Name of the current state
 * @param machine Reference to Transitionable object
 * @param promptStateName (optional) Name of prompt state to transition to, defaults to "PromptState"
 * @param redirectArguments (optional) Additional arguments to pass to the current state and intent
 */
export type PromptFactory = (intent: string, stateName: string, machine: Transitionable, promptStateName?: string, redirectArguments?: any[]) => Prompt;

export interface Prompt {
  /**
   * Starts prompting for a parameter
   * @param parameter string The parameter to prompt for
   * @param tellInvokeMessage boolean If set to true (default), sends response to ask the user for the parameter
   */
  prompt(parameter: string, tellInvokeMessage?: boolean): Promise<void>;
}

/**
 * Requirements you need to use the PromptMixin in one of your prompt states.
 * To fulfill them, add a class in your class hierarchy below BaseState and add these parameters to your constructor.
 * In your class using the PromptState mixin, just inject all of these requirements.
 * You find an example in the assistant-validations README.
 */
export interface PromptStateMixinRequirements {
  /** The current entitiy dictionary, injectable via {@link injectionNames.current.entityDictionary} */
  entities: EntityDictionary;

  /** The current session factory, injectable via {@link injectionNames.current.sessionFactory} */
  sessionFactory: CurrentSessionFactory;

  /** Your entity mappings, injectable via {@link injectionNames.userEntityMappings} */
  mappings: PlatformGenerator.EntityMapping;
}

/**
 * Interface describing PromptMixin
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

  /**
   * Unserializes hook context
   */
  unserializeHook(): Promise<HookContext<ValidationStrategy.Prompt>>;

  /** Stores all entities currently present in entity dictionary into session. */
  storeCurrentEntitiesToSession(): Promise<void>;

  /** Opposite of storeCurrentEntitiesToSession() */
  applyStoredEntities(): Promise<void>;
}

/** Configuration of validations component */
export interface ValidationsConfiguration extends Partial<Configuration.Defaults>, Configuration.Required {}

/** Property describing the configuration of the validations component */
export interface ValidationsConfigurationAttribute {
  validations?: ValidationsConfiguration;
}
