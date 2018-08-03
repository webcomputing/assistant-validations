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

class PromptStateRequirements<MergedAnswerTypes extends BasicAnswerTypes, MergedHandler extends BasicHandable<MergedAnswerTypes>> extends BaseState<
  MergedAnswerTypes,
  MergedHandler
> implements PromptStateMixinRequirements {
  constructor(
    stateSetupSet: State.SetupSet<MergedAnswerTypes, MergedHandler>,
    public entities: EntityDictionary,
    public sessionFactory: CurrentSessionFactory,
    public mappings: PlatformGenerator.EntityMapping
  ) {
    super(stateSetupSet);
  }
}

@injectable()
export class PromptState<MergedAnswerTypes extends BasicAnswerTypes, MergedHandler extends BasicHandable<MergedAnswerTypes>> extends PromptStateMixin(
  PromptStateRequirements
)<MergedAnswerTypes, MergedHandler> {
  constructor(
    @inject(injectionNames.current.stateSetupSet) setupSet: State.SetupSet<MergedAnswerTypes, MergedHandler>,
    @inject(injectionNames.current.entityDictionary) entities: EntityDictionary,
    @inject(injectionNames.current.sessionFactory) sessionFactory: CurrentSessionFactory,
    @inject("core:unifier:user-entity-mappings") mappings: PlatformGenerator.EntityMapping
  ) {
    super(setupSet, entities, sessionFactory, mappings);
  }
}
