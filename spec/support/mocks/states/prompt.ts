// tslint:disable:max-classes-per-file
import { BaseState, CurrentSessionFactory, EntityDictionary, injectionNames, PlatformGenerator, State } from "assistant-source";
import { inject, injectable } from "inversify";
import { PromptStateMixin, PromptStateMixinRequirements } from "../../../../src/assistant-validations";

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
