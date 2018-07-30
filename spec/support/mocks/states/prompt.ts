// tslint:disable:max-classes-per-file
import {
  BaseState,
  BasicAnswerTypes,
  BasicHandable,
  CurrentSessionFactory,
  EntityDictionary,
  injectionNames,
  PlatformGenerator,
  State,
} from "assistant-source";
import { inject, injectable } from "inversify";
import { PromptStateMixin, PromptStateMixinRequirements } from "../../../../src/assistant-validations";

class PromptStateRequirements<CustomTypes extends BasicAnswerTypes, CustomHandler extends BasicHandable<CustomTypes>> extends BaseState<
  CustomTypes,
  CustomHandler
> implements PromptStateMixinRequirements {
  constructor(
    stateSetupSet: State.SetupSet<CustomTypes, CustomHandler>,
    public entities: EntityDictionary,
    public sessionFactory: CurrentSessionFactory,
    public mappings: PlatformGenerator.EntityMapping
  ) {
    super(stateSetupSet);
  }
}

@injectable()
export class PromptState<CustomTypes extends BasicAnswerTypes, CustomHandler extends BasicHandable<CustomTypes>> extends PromptStateMixin(
  PromptStateRequirements
)<CustomTypes, CustomHandler> {
  constructor(
    @inject(injectionNames.current.stateSetupSet) setupSet: State.SetupSet<CustomTypes, CustomHandler>,
    @inject(injectionNames.current.entityDictionary) entities: EntityDictionary,
    @inject(injectionNames.current.sessionFactory) sessionFactory: CurrentSessionFactory,
    @inject("core:unifier:user-entity-mappings") mappings: PlatformGenerator.EntityMapping
  ) {
    super(setupSet, entities, sessionFactory, mappings);
  }
}
