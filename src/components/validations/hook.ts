import { ComponentSpecificLoggerFactory, EntityDictionary, Hooks, injectionNames, Logger, State } from "assistant-source";
import { inject, injectable } from "inversify";

import { decoratorSymbols } from "./decorators";
import { validationsInjectionNames } from "./injection-names";
import { COMPONENT_NAME } from "./private-interfaces";
import { DecoratorContent, InitializerOptions } from "./public-interfaces";
import { ValidationsInitializer } from "./validations-initializer";

@injectable()
export class BeforeIntentHook {
  private logger: Logger;

  constructor(
    @inject(injectionNames.current.entityDictionary) private entities: EntityDictionary,
    @inject(validationsInjectionNames.current.validationsInitializer) private validationsInitializer: ValidationsInitializer,
    @inject(injectionNames.componentSpecificLoggerFactory) loggerFactory: ComponentSpecificLoggerFactory
  ) {
    this.logger = loggerFactory(COMPONENT_NAME);
  }

  public execute: Hooks.BeforeIntentHook = async (mode, state, stateName, intent, machine, ...args: any[]) => {
    // First of all, check if pormpt is needed.
    const promptNeeded = await this.needsPrompt(state, intent, args);
    if (promptNeeded !== false) {
      // If so, start prompting using validations initializer...
      this.logger.info(`Missing required entity ${promptNeeded.unknownEntity} in current entity store.`);
      await this.validationsInitializer.initializePrompt(stateName, intent, promptNeeded.unknownEntity, promptNeeded.promptOptions);

      // ... and return false to interrupt state machine
      return false;
    }

    // Secondly, do the same for confirmation
    const confirmationNeeded = await this.initializeConfirmationIfNeeded();
    if (confirmationNeeded !== false) {
      // ... and return false to interrupt state machine
      return false;
    }

    // If no validation / transition is needed, tell state machine to continue
    return true;
  };

  private async initializeConfirmationIfNeeded(): Promise<boolean> {
    return false;
  }

  /** Checks if we need to prompt for entities, and if so, returns information about the prompting we need, ready to use for validationsInitializer. Returns false otherwise. */
  private async needsPrompt(
    state: State.Required,
    intentMethod: string,
    args: any[]
  ): Promise<false | { unknownEntity: string; promptOptions: Partial<InitializerOptions.Prompt> }> {
    const decoratorContent = this.retrieveNeededEntitiesFromMetadata(state, intentMethod);

    if (decoratorContent && decoratorContent.entities.length > 0) {
      const unknownEntity = decoratorContent.entities.filter(p => !this.currentRequestHasEntities(p))[0];

      if (typeof unknownEntity !== "undefined") {
        return {
          unknownEntity,
          promptOptions: {
            promptStateName: decoratorContent.promptStateName,
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
  private retrieveNeededEntitiesFromMetadata(target: State.Required, method: string): DecoratorContent.NeedsEntity | undefined {
    if (typeof target === "undefined" || typeof method === "undefined" || typeof target[method] === "undefined") return undefined;
    const neededParams: DecoratorContent.NeedsEntity = Reflect.getMetadata(decoratorSymbols.needsEntities, target[method]);

    if (typeof neededParams !== "undefined" && Array.isArray(neededParams.entities)) {
      this.logger.debug(`Retrieving @needsEntities decorators for ${target.constructor.name}#${method}.`);

      if (neededParams.entities.filter(param => typeof param !== "string").length > 0) {
        throw new TypeError("Only strings are allowed as parameter identifiers!");
      }

      return neededParams;
    }
  }
}
