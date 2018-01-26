import { BaseState, State, EntityDictionary, CurrentSessionFactory, PlatformGenerator, injectionNames } from "assistant-source";
import { PromptStateMixinRequirements, PromptStateMixin } from "../../../../src/assistant-validations";
import { injectable, inject } from "inversify";

class PromptStateRequirements extends BaseState implements PromptStateMixinRequirements {
  constructor(
    stateSetupSet: State.SetupSet,
    public entities: EntityDictionary,
    public sessionFactory: CurrentSessionFactory,
    public mappings: PlatformGenerator.EntityMapping
  ) {
    super(stateSetupSet);
  }
}

@injectable()
export class PromptState extends PromptStateMixin(PromptStateRequirements) {
  constructor(
    @inject(injectionNames.current.stateSetupSet) setupSet: State.SetupSet,
    @inject(injectionNames.current.entityDictionary) entities: EntityDictionary,
    @inject(injectionNames.current.sessionFactory) sessionFactory: CurrentSessionFactory,
    @inject("core:unifier:user-entity-mappings") mappings: PlatformGenerator.EntityMapping
  ) {
    super(setupSet, entities, sessionFactory, mappings);
  }
}