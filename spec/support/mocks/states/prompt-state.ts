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
import { inject, injectable, unmanaged } from "inversify";
import { PromptStateMixin, PromptStateMixinRequirements } from "../../../../src/assistant-validations";

class PromptStateRequirements<MergedAnswerTypes extends BasicAnswerTypes, MergedHandler extends BasicHandable<MergedAnswerTypes>> extends BaseState<
  MergedAnswerTypes,
  MergedHandler
> implements PromptStateMixinRequirements {
  constructor(
    @unmanaged() stateSetupSet: State.SetupSet<MergedAnswerTypes, MergedHandler>,
    @unmanaged() public entities: EntityDictionary,
    @unmanaged() public sessionFactory: CurrentSessionFactory,
    @unmanaged() public mappings: PlatformGenerator.EntityMapping
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
    @inject(injectionNames.userEntityMapping) mappings: PlatformGenerator.EntityMapping
  ) {
    super(setupSet, entities, sessionFactory, mappings);
  }
}
