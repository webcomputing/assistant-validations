import { ComponentSpecificLoggerFactory, EntityDictionary, Hooks, injectionNames, Logger, State } from "assistant-source";
import { inject, injectable } from "inversify";

import { validationsInjectionNames } from "../../../src/components/validations/injection-names";
import { decoratorSymbols } from "./decorators";
import { COMPONENT_NAME } from "./private-interfaces";
import { DecoratorContent, PromptFactory } from "./public-interfaces";

@injectable()
export class BeforeIntentHook {
  private target?: State.Required;
  private stateName?: string;
  private method?: string;
  private logger: Logger;

  constructor(
    @inject(injectionNames.current.entityDictionary) private entities: EntityDictionary,
    @inject(validationsInjectionNames.current.promptFactory) private promptFactory: PromptFactory,
    @inject(injectionNames.componentSpecificLoggerFactory) loggerFactory: ComponentSpecificLoggerFactory
  ) {
    this.logger = loggerFactory(COMPONENT_NAME);
  }

  public execute: Hooks.BeforeIntentHook = async (mode, state, stateName, intent, machine, ...args: any[]) => {
    this.target = state;
    this.stateName = stateName;
    this.method = intent;

    const neededParams = this.retrieveNeededParamsFromMetadata();

    if (neededParams && neededParams.entities.length > 0) {
      const unknownParam = neededParams.entities.filter(p => !this.currentRequestHasParam(p))[0];

      if (typeof unknownParam !== "undefined") {
        this.logger.info(`Missing required entity ${unknownParam} in current entity store.`);
        await this.promptFactory(this.method, this.stateName, machine, undefined, args).prompt(unknownParam);
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
  private retrieveNeededParamsFromMetadata(): DecoratorContent.NeedsEntity | undefined {
    if (typeof this.target === "undefined" || typeof this.method === "undefined" || typeof this.target[this.method] === "undefined") return;
    const neededParams: DecoratorContent.NeedsEntity = Reflect.getMetadata(decoratorSymbols.needsEntities, this.target[this.method]);

    if (typeof neededParams !== "undefined" && Array.isArray(neededParams.entities)) {
      this.logger.debug(`Retrieving @needsEntities decorators for ${this.target.constructor.name}#${this.method}.`);

      if (neededParams.entities.filter(param => typeof param !== "string").length > 0) {
        throw new TypeError("Only strings are allowed as parameter identifiers!");
      }

      return neededParams;
    }
  }
}
