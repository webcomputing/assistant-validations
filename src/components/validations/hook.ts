import { ComponentSpecificLoggerFactory, EntityDictionary, Hooks, injectionNames, Logger, State } from "assistant-source";
import { inject, injectable } from "inversify";

import { decoratorSymbols } from "./decorators";
import { validationsInjectionNames } from "./injection-names";
import { COMPONENT_NAME } from "./private-interfaces";
import { ConfirmationResult, confirmationResultIdentifier, DecoratorOptions, InitializerOptions } from "./public-interfaces";
import { ValidationsInitializer } from "./validations-initializer";

/**
 * This class executes a hook before every intent to check, if a decorator has been used for the state or intent.
 * If a @needsEntity decorator has been used, it initializes the promptState and interrupts the state machine.
 * If a @needsConfirmation decorator has been used, it initializes a confirmationState and interrupts the state machine.
 * If no one of these decorators has been used, the state machine continues.
 */
@injectable()
export class BeforeIntentHook {
  private logger: Logger;

  constructor(
    @inject(injectionNames.current.entityDictionary) private entities: EntityDictionary,
    /** Service containing functions to initialize the prompt or confirmation state */
    @inject(validationsInjectionNames.current.validationsInitializer) private validationsInitializer: ValidationsInitializer,
    @inject(injectionNames.componentSpecificLoggerFactory) loggerFactory: ComponentSpecificLoggerFactory
  ) {
    this.logger = loggerFactory(COMPONENT_NAME);
  }

  public execute: Hooks.BeforeIntentHook = async (mode, state, stateName, intent, machine, ...args: any[]) => {
    // First of all, check if prompt is needed.
    const promptNeeded = await this.needsPrompt(state, intent, args);
    if (promptNeeded !== false) {
      // If so, start prompting using validations initializer...
      this.logger.info(`Missing required entity ${promptNeeded.unknownEntity} in current entity store.`);
      await this.validationsInitializer.initializePrompt(stateName, intent, promptNeeded.unknownEntity, promptNeeded.promptOptions);

      // ... and return false to interrupt state machine
      return false;
    }

    // Secondly, do the same for confirmation
    const confirmationNeeded = await this.needsConfirmation(state, intent, args);
    if (confirmationNeeded !== false) {
      await this.validationsInitializer.initializeConfirmation(stateName, intent, confirmationNeeded);

      // ... and return false to interrupt state machine
      return false;
    }

    // If no validation / transition is needed, tell state machine to continue
    return true;
  };

  /** Checks if we need to confirm this intent, and if so, returns information about the confirmation we need. Returns false otherwise. */
  private async needsConfirmation(state: State.Required, intentMethod: string, args: any[]): Promise<false | Partial<InitializerOptions.Confirmation>> {
    const decoratorOptions = this.retrieveNeededConfirmationFromMetadata(state, intentMethod);

    if (typeof decoratorOptions !== "undefined") {
      const lastArgument: ConfirmationResult | undefined = args.slice(-1)[0];
      if (lastArgument && lastArgument.returnIdentifier === confirmationResultIdentifier) {
        // State is decorated with @needsConfirmation, but confirmation is already done - the result is already here!
        this.logger.info(
          `${state.constructor.name}#${intentMethod} is decorated with @needsConfirmation, but we already got a confirmation result. Won't halt state machine.`
        );
        return false;
      }

      // State is decorated with @needsConfirmation, and there was no confirmation yet - so let's confirm!
      this.logger.info(`${state.constructor.name}#${intentMethod} is decorated with @needsConfirmation - halting state machine to initialize confirmation.`);
      return { ...decoratorOptions, redirectArguments: args };
    }

    return false;
  }

  /** Checks if we need to prompt for entities, and if so, returns information about the prompting we need, ready to use for validationsInitializer. Returns false otherwise. */
  private async needsPrompt(
    state: State.Required,
    intentMethod: string,
    args: any[]
  ): Promise<false | { unknownEntity: string; promptOptions: Partial<InitializerOptions.Prompt> }> {
    const decoratorOptions = this.retrieveNeededEntitiesFromMetadata(state, intentMethod);

    if (decoratorOptions && decoratorOptions.entities.length > 0) {
      const unknownEntity = decoratorOptions.entities.filter(p => !this.currentRequestHasEntities(p))[0];

      if (typeof unknownEntity !== "undefined") {
        return {
          unknownEntity,
          promptOptions: {
            promptStateName: decoratorOptions.promptStateName,
            redirectArguments: args,
          },
        };
      }
    }

    return false;
  }

  /**
   * Checks if current request already has the given parameter
   * @param parameter The parameter to check existance of
   */
  private currentRequestHasEntities(entities: string): boolean {
    return this.entities.contains(entities);
  }

  /** Returns needed entities based on Reflect.getMetadata result = based from what is stored into @needsEntities(..) */
  private retrieveNeededEntitiesFromMetadata(target: State.Required, method: string): DecoratorOptions.NeedsEntity | undefined {
    const neededParams = this.retrieveDecoratorOptions<DecoratorOptions.NeedsEntity>(target, method, decoratorSymbols.needsEntities);

    if (typeof neededParams !== "undefined" && Array.isArray(neededParams.entities)) {
      this.logger.debug(`Retrieving @needsEntities decorators for ${target.constructor.name}#${method}.`);

      if (neededParams.entities.filter(param => typeof param !== "string").length > 0) {
        throw new TypeError("Only strings are allowed as parameter identifiers!");
      }

      return neededParams;
    }
  }

  /** Returns options of needsConfirmation decorator */
  private retrieveNeededConfirmationFromMetadata(target: State.Required, method: string): DecoratorOptions.Confirmation | undefined {
    const decoratorOptions = this.retrieveDecoratorOptions<DecoratorOptions.Confirmation>(target, method, decoratorSymbols.needsConfirmation);

    if (typeof decoratorOptions !== "undefined") {
      this.logger.debug(`Retrieving @needsConfirmation decorators for ${target.constructor.name}#${method}.`);
    }

    return decoratorOptions;
  }

  /** Returns options of any decorator */
  private retrieveDecoratorOptions<T extends DecoratorOptions.NeedsEntity | DecoratorOptions.Confirmation>(
    target: State.Required,
    method: string,
    decoratorSymbol: symbol
  ): T | undefined {
    if (typeof target === "undefined" || typeof method === "undefined" || typeof target[method] === "undefined") return undefined;
    return Reflect.getMetadata(decoratorSymbol, target[method]);
  }
}
