## assistant-validations

assistant-validations is an [AssistantJS][1] component which gives you an easy way to validate entities in your voice application. Install assistant-validations with
`npm install assistant-validations --save` and add it as a dependency to your `index.ts`:

```typescript
import { descriptor as validationsDescriptor } from "assistant-validations";

/** and below, in your "initializeSetups" method: */
assistantJs.registerComponent(validationsDescriptor);
```

In addition, you also have to set up the PromptState which is called every time an entity is missing. To do so, you can use our `PromptStateMixin`:

```typescript
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
import { MergedSetupSet } from "../../config/handler";

/**
 * This small class is needed to apply the PromptStateMixin since TypeScript does not allow type-specific constructor mixins.
 * Just add it to your regular class hierarchy.
 */
@injectable()
class PromptStateRequirements extends ApplicationState implements PromptStateMixinRequirements {
  constructor(
    stateSetupSet: MergedSetupSet,
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
    @inject(injectionNames.current.stateSetupSet) setupSet: MergedSetupSet,
    @inject(injectionNames.current.entityDictionary) entities: EntityDictionary,
    @inject(injectionNames.current.sessionFactory) sessionFactory: CurrentSessionFactory,
    @inject("core:unifier:user-entity-mappings") mappings: PlatformGenerator.EntityMapping
  ) {
    super(setupSet, entities, sessionFactory, mappings);
  }
}
```

If you don't call your state PromptState, you will have to change the value of `defaultPromptState` in the assistant-validations configuration (see below).

### Usage

assistant-validations gives you the `@need` decorator to define which entities you need for a specific intent or state. For example, if you need the entity `target` in your `MainState` (as introduced in the [second chapter of the AssistantJS's video tutorial][2]):

```typescript
import { ApplicationState } from "./application";
import { injectionNames, State } from "assistant-source";
import { needs } from "assistant-validations";
import { injectable, inject } from "inversify";
import { MergedSetupSet } from "../../config/handler";

@injectable()
export class MainState extends ApplicationState {
  constructor(@inject(injectionNames.current.stateSetupSet) setupSet: MergedSetupSet) {
    super(setupSet);
  }

  @needs("target")
  async busRouteIntent(machine: Transitionable) {
    // ...
  }
}
```

Now, everytime the `busRouteIntent` of your `MainState` is called, assistant-validations forces AssistantJS to check if the entity `target` is present. If not, it prompts for this entity and returns to the `busRouteIntent` as soon as the entity is given. This prompting is done by the set up `PromptState`.

assistant-validations adds the `answerPromptIntent` to your intent dictionary, and also automatically adds utterances for it. The `answerPromptIntent` is triggered if the user responds with a plain entity value, for example if he or she answers with "train station" to the question: "where do you want to go to?".

#### I18N integration

All intent methods implemented in our [states/prompt.ts](src/components/validations/states/prompt.ts) make use of the [AssistantJS's i18n conventions][3]. To differ between multiple entity names, all `translateHelper` calls are appended by the prompted entity's name. For example, if you prompt for an entity name called "target", these rules would apply:

| Intent                 | Description                                                                                                                                            | I18N key                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| invokeGenericIntent    | Invoked automatically at prompt start. Message can be omitted using `promptFactory`.                                                                   | promptState.invokeGenericIntent.target    |
| unhandledGenericIntent | Invoked if the user fires an intent which is not handleable by the prompt state or if the given entity value does not fit to prompted the entity type. | promptState.unhandledGenericIntent.target |
| cancelGenericIntent    | Invoked if the user says 'cancel'                                                                                                                      | promptState.cancelGenericIntent.target    |
| stopGenericIntent      | Invoked if the user says 'stop'                                                                                                                        | same as cancel                            |
| helpGenericIntent      | Invoked if the user says 'help'                                                                                                                        | promptState.helpGenericIntent.target      |

If you use a custom prompt state (see below), it's name will be used instead of `promptState` in all i18n keys.

If you want to set suggestion chips with your prompts, just use the "suggestionChips.entityName" key.

#### Multiple entities

You can also use `@needs` to prompt for multiple entities. To do so, pass all entity names as arguments:

```typescript
export class MainState {
  @needs("fromBusStop", "toBusStop")
  async busRouteIntent(machine: stateMachineInterfaces.Transitionable) {
    // ...
  }
}
```

Now, AssistantJS ensures that both `fromBusStop` and `toBusStop` are given before executing `busRouteIntent`.

#### Initialize prompt dynamically

Sometimes, you want to prompt for an entity based on some previous conditions. In that case, you can use our `promptFactory` to initialize a prompt whenever you need to:

```typescript
import { ApplicationState } from "./application";
import { injectionNames, State, Transitionable } from "assistant-source";
import { needs, PromptFactory, Prompt, validationsInjectionNames } from "assistant-validations";
import { injectable, inject } from "inversify";
import { MergedSetupSet } from "../../config/handler";


@injectable()
export class MainState extends ApplicationState {

  constructor(
    @inject(injectionNames.current.stateSetupSet) setupSet: MergedSetupSet
    @inject(validationsInjectionNames.current.promptFactory) private currentPromptFactory: PromptFactory
  ) {
    super(setupSet);
  }

  async busRouteIntent(machine: Transitionable, ...args: any[]) {
    const promptInitializer = this.currentPromptFactory("busRouteIntent", "MainState", machine, "MyCustomPromptState", ...args);

    /** If "target" is missing / invalid ... */
    this.prompt(this.t(".targetInvalid"));
    return promptInitializer.prompt("target", false);
  }
}
```

As you can see, using `promptFactory` forces you to pass the intent method and state name to return to, but is also gives you some additional options:

* You are able to specify a _custom prompt state_, which is used instead of the assistant-validations's default `PromptState` (here: `MyCustomPromptState`)
* You are able to add additional arguments which are then passed to the returning call of `busRouteIntent`
* You are able to omit the default voice response (by passing `false` as second argument to `promptInitializer.prompt`), which gives you the flexibility to send dynamic responses for your specific use cases

#### Using a custom prompt state

If you need more flexibility, you can change the behaviour of your prompt state (see "Installation") or implement multiple ones. For example, this custom prompt state would redirect to MainState instead of aborting the conversation if a user fires a `cancelGenericIntent`:

```typescript
import { State, EntityDictionary, CurrentSessionFactory, PlatformGenerator, injectionNames } from "assistant-source";
import { PromptStateMixin } from "assistant-validations";
import { injectable, inject } from "inversify";
import { MergedSetupSet } from "../../config/handler";

@injectable()
export class PromptState extends PromptStateMixin(PromptStateRequirements) {
  constructor(
    @inject(injectionNames.current.stateSetupSet) setupSet: MergedSetupSet,
    @inject(injectionNames.current.entityDictionary) entities: EntityDictionary,
    @inject(injectionNames.current.sessionFactory) sessionFactory: CurrentSessionFactory,
    @inject("core:unifier:user-entity-mappings") mappings: PlatformGenerator.EntityMapping
  ) {
    super(setupSet, entities, sessionFactory, mappings);
  }

  /** Cancel the prompting and go on with main state */
  async cancelGenericIntent(machine: Transitionable) {
    this.prompt(this.t());
    return machine.transitionTo("MainState");
  }
}
```

### Configuration

As listed in our [interfaces](src/components/validations/private-interfaces.ts), the only possible configuration option is `defaultPromptState`:

```typescript
/** Optional configuration settings */
export interface Defaults {
  /** Name of prompt state to use for all @needs validations as default */
  defaultPromptState: string;
}

/** No configuration settings are required */
export interface Required {}
```

By passing this option you can overwrite the default prompt state, which is then used in all `@need` calls instead of `PromptState`. Just merge our configuration interface `ValidationsConfigurationAttribute` with your existing AssistantJS configuration in `config/components.ts`.

[1]: http://assistantjs.org
[2]: https://github.com/webcomputing/AssistantJS/wiki/Getting-Started#step-2-explore-assistantjss-core-concepts
[3]: https://github.com/webcomputing/AssistantJS/wiki/Internationalization
