import { ComponentSpecificLoggerFactory, EntityDictionary, Hooks, injectionNames, Logger, State } from "assistant-source";
import { inject, injectable } from "inversify";

import { validationsInjectionNames } from "../../../src/components/validations/injection-names";
import { decoratorSymbols } from "./decorators";
import { COMPONENT_NAME } from "./private-interfaces";
import { DecoratorContent, PromptFactory } from "./public-interfaces";

@injectable()
export class BeforeIntentHook {
  private logger: Logger;

  constructor(
    @inject(injectionNames.current.entityDictionary) private entities: EntityDictionary,
    @inject(validationsInjectionNames.current.promptFactory) private promptFactory: PromptFactory,
    @inject(injectionNames.componentSpecificLoggerFactory) loggerFactory: ComponentSpecificLoggerFactory
  ) {
    this.logger = loggerFactory(COMPONENT_NAME);
  }

  public execute: Hooks.BeforeIntentHook = async (mode, state, stateName, intent, machine, ...args: any[]) => {
    const neededParams = this.retrieveNeededParamsFromMetadata(state, intent);

    if (neededParams && neededParams.entities.length > 0) {
      const unknownParam = neededParams.entities.filter(p => !this.currentRequestHasParam(p))[0];

      if (typeof unknownParam !== "undefined") {
        this.logger.info(`Missing required entity ${unknownParam} in current entity store.`);
        await this.promptFactory(intent, stateName, machine, neededParams.promptStateName, args).prompt(unknownParam);
        return false;
      }
    }

    return true;
  };

  /**
   * Checks if current request already has the given parameter
   * @param parameter The parameter to check existance of
   */
  private currentRequestHasParam(entities: string): boolean {
    return this.entities.contains(entities);
  }

  /** Sets this.neededParams based on Reflect.getMetadata result = based from what is stored into @needsEntities(..) */
  private retrieveNeededParamsFromMetadata(target: State.Required, method: string): DecoratorContent.NeedsEntity | undefined {
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
