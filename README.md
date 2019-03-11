## assistant-validations

assistant-validations is an [AssistantJS][1] component which gives you an easy way to validate entities or use confirmations in your voice application. Install assistant-validations with
`npm install assistant-validations --save` and add it as a dependency to your `index.ts`:

```typescript
import { descriptor as validationsDescriptor } from "assistant-validations";

/** and below, in your "initializeSetups" method: */
assistantJs.registerComponent(validationsDescriptor);
```

### Prerequisites

If you want to validate entities, you also have to set up the PromptState which is called every time an entity is missing. To do so, you can use our `PromptStateMixin`:

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
    @unmanaged() stateSetupSet: MergedSetupSet,
    @unmanaged() public entities: EntityDictionary,
    @unmanaged() public sessionFactory: CurrentSessionFactory,
    @unmanaged() public mappings: PlatformGenerator.EntityMapping
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
    @inject(injectionNames.userEntityMappings) mappings: PlatformGenerator.EntityMapping
  ) {
    super(setupSet, entities, sessionFactory, mappings);
  }
}
```

If you don't call your state PromptState, you will have to change the value of `defaultPromptState` in the assistant-validations configuration (see below).

#

If you want to use confirmations, you have to set up the ConfirmationState, which is called every time a confirmation needs to be done. To do so, you can use our `ConfirmationStateMixin`:

```typescript
import {
  CurrentSessionFactory,
  injectionNames,
  State,
} from "assistant-source";
import { inject, injectable } from "inversify";
import { ConfirmationStateMixin, ConfirmationStateMixinRequirements } from "../../../../src/assistant-validations";
import { MergedSetupSet } from "../../config/handler";

/**
 * This small class is needed to apply the ConfirmationStateMixin since TypeScript does not allow type-specific constructor mixins.
 * Just add it to your regular class hierarchy.
 */
@injectable()
class ConfirmationStateRequirements extends ApplicationState implements ConfirmationStateMixinRequirements {
  constructor(
    stateSetupSet: MergedSetupSet,
    public sessionFactory: CurrentSessionFactory,
  ) {
    super(stateSetupSet);
  }
}

@injectable()
export class ConfirmationState extends ConfirmationStateMixin(ConfirmationStateRequirements) {
  constructor(
    @inject(injectionNames.current.stateSetupSet) setupSet: MergedSetupSet,
    @inject(injectionNames.current.sessionFactory) sessionFactory: CurrentSessionFactory,
  ) {
    super(setupSet, sessionFactory);
  }
}
```

If you don't call your state ConfirmationState, you will have to change the value of `defaultConfirmationState` in the assistant-validations configuration (see below).

### Usage

assistant-validations gives you different decorators, which expand your state or intent with the given functionality:

#### Entity Validation

assistant-validations gives you the `@needsEntities` (formerly `@needs`) decorator to define which entities you need for a specific intent or state. For example, if you need the entity `target` in your `MainState` (as introduced in the [second chapter of the AssistantJS's video tutorial][2]):

```typescript
import { ApplicationState } from "./application";
import { injectionNames, State } from "assistant-source";
import { needsEntities } from "assistant-validations";
import { injectable, inject } from "inversify";
import { MergedSetupSet } from "../../config/handler";

@injectable()
export class MainState extends ApplicationState {
  constructor(@inject(injectionNames.current.stateSetupSet) setupSet: MergedSetupSet) {
    super(setupSet);
  }

  @needsEntities(["target"])
  async busRouteIntent(machine: Transitionable) {
    // ...
  }
}
```

Now, everytime the `busRouteIntent` of your `MainState` is called, assistant-validations forces AssistantJS to check if the entity `target` is present. If not, it prompts for this entity and returns to the `busRouteIntent` as soon as the entity is given. This prompting is done by the set up `PromptState`.

assistant-validations adds the `answerPromptIntent` to your intent dictionary, and also automatically adds utterances for it. The `answerPromptIntent` is triggered if the user responds with a plain entity value, for example if he or she answers with "train station" to the question: "where do you want to go to?".

##### Multiple entities

You can also use `@needsEntities` to prompt for multiple entities. To do so, pass all entity names as arguments:

```typescript
export class MainState {
  @needsEntities(["fromBusStop", "toBusStop"])
  async busRouteIntent(machine: stateMachineInterfaces.Transitionable) {
    // ...
  }
}
```

Now, AssistantJS ensures that both `fromBusStop` and `toBusStop` are given before executing `busRouteIntent`.

#### Confirmation

assistant-validations gives you the `@needsConfirmation` decorator to ask a user for a confirmation before a specific state or intent is called. For example in your `MainState`:

```typescript
import { ApplicationState } from "./application";
import { injectionNames, State } from "assistant-source";
import { needsConfirmation, ConfirmationResult } from "assistant-validations";
import { injectable, inject } from "inversify";
import { MergedSetupSet } from "../../config/handler";

@injectable()
export class MainState extends ApplicationState {
  constructor(@inject(injectionNames.current.stateSetupSet) setupSet: MergedSetupSet) {
    super(setupSet);
  }

  @needsConfirmation()
  async busRouteIntent(machine: Transitionable, confirmationResult: ConfirmationResult) {
    // ...
  }
}
```

Now, everytime the `busRouteIntent` of the `MainState` is called, assistant-validations forces AssistantJS to ask the user for his confirmation and  transitions back to the `busRouteIntent` after an answer was given. AssistantJS will give you the result of the confirmation as last argument of your intent method.

#### I18N integration [](#i18n-integration)

All intent methods implemented in our [states](src/components/validations/states) make use of the [AssistantJS's i18n conventions][3].

If you use a custom prompt or confirmation state (see below), its name will be used instead in all i18n keys.

##### Entity validation

To differ between multiple entity names, all `translateHelper` calls are appended by the prompted entity's name. For example, if you prompt for an entity name called "target" these rules would apply:

| Intent                 | Description                                                                                                                                            | I18N key                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| invokeGenericIntent    | Invoked automatically at prompt start. Message can be omitted using `validations-initializer`.                                                                   | promptState.invokeGenericIntent.target    |
| unhandledGenericIntent | Invoked if the user fires an intent which is not handleable by the prompt state or if the given entity value does not fit to prompted the entity type. | promptState.unhandledGenericIntent.target |
| cancelGenericIntent    | Invoked if the user says 'cancel'                                                                                                                      | promptState.cancelGenericIntent.target    |
| stopGenericIntent      | Invoked if the user says 'stop'                                                                                                                        | same as cancel                            |
| helpGenericIntent      | Invoked if the user says 'help'                                                                                                                        | promptState.helpGenericIntent.target      |


If you want to set suggestion chips with your prompts, just use the "promptState.suggestionChips.entityName" key.

##### Confirmation

To define different prompts for different states and intents, that use the confirmation, the `translateHelper` calls are appended by the state and intent name. For example, if you would need the confirmation of an intent called `finishTransactionIntent` in a state called `MainState`:

| Intent                 | Description                                                                                                                                            | I18N key                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| invokeGenericIntent    | Invoked automatically at confirmation start. Message can be omitted using `validations-initializer`.                                                                   | confirmationState.invokeGenericIntent.MainState.finishTransactionIntent    |
| helpGenericIntent      | Invoked if the user says 'help'                                                                                                                        | confirmationState.helpGenericIntent.MainState.finishTransactionIntent      |
| unhandledGenericIntent | Invoked if the user fires an intent which is not handleable by the confirmation state. | confirmationState.unhandledGenericIntent.MainState.finishTransactionIntent |
| cancelGenericIntent    | Invoked if the user says 'cancel'                                                                                                                      | confirmationState.cancelGenericIntent    |
| stopGenericIntent      | Invoked if the user says 'stop'                                                                                                                        | same as cancel                            |

If you want to use suggestion chips with your confirmations, use the "confirmationState.suggestionChips" key.

##### Using a custom translation convention

If you don't want to use the default translation conventions, you can override the function `getPromptTranslationConvention` and `getSuggestionChipsTranslationConvention` in your own validation state. For an example see [Using a custom state](#using-a-custom-state).

#### Initialize validations dynamically

Sometimes, you want to prompt for an entity or start a confirmation based on some previous conditions. In that case, you can use our `validations-initializer` to initialize a prompt or confirmation whenever you need to:

```typescript
import { ApplicationState } from "./application";
import { injectionNames, State, Transitionable } from "assistant-source";
import { ValidationsInitializer, validationsInjectionNames } from "assistant-validations";
import { injectable, inject } from "inversify";
import { MergedSetupSet } from "../../config/handler";


@injectable()
export class MainState extends ApplicationState {

  constructor(
    @inject(injectionNames.current.stateSetupSet) setupSet: MergedSetupSet
    @inject(validationsInjectionNames.current.validationsInitializer) private currentValidationsInitializer: ValidationsInitializer
  ) {
    super(setupSet);
  }

  async busRouteIntent(machine: Transitionable, ...args: any[]) {

    /** If "target" is missing / invalid ... */
    this.prompt(this.t(".targetInvalid"));
    return validationsInitializer.initializePrompt("MainState", "busRouteIntent", "target", { promptStateName: "MyCustomPromptState" });
  }

  async finishTransactionIntent(machine: Transitionable, ...args: any[]) {

    /** If some condition is met */
    return validationsInitializer.initializeConfirmation("MainState", "finishTransactionIntent", { tellInvokeMessage: false });
  }
}
```

As you can see, using the `validationsInitializer` offers the possibility to create an entity validation or confirmation dynamically, by calling the respective functions. These functions force you to pass the state name and intent method (and the entity name in case of a prompt) to return to, but is also gives you some additional options, based on the validation used:

|Parameter|Validation|Description|
|---------|----------|-----------|
|tellInvokeMessage|*|If set to true, invoking the validation state creates a message based on i18n for the user. See [I18N Integration](#i18n-integration) for the specific I18N key used. |
|redirectArguments|*|Additional Arguments, which are then passed onto the returning call|
|promptStateName|prompt|Name of the _custom prompt state_ used instead of assistant-validation's default `PromptState`|
|confirmationStateName|confirmation|Name of the _custom confirmation state_ used instead of assistant-validation's default `ConfirmationState`|

#### Using a custom state [](#using-a-custom-state)

If you need more flexibility, you can change the behaviour of your prompt state (see "Installation") or even implement multiple ones. For example, this custom prompt state would redirect to MainState instead of aborting the conversation if a user fires a `cancelGenericIntent` and use a different convention for its translations:

```typescript
import { State, EntityDictionary, CurrentSessionFactory, PlatformGenerator, injectionNames } from "assistant-source";
import { PromptStateMixin, ValidationStrategy } from "assistant-validations";
import { injectable, inject } from "inversify";
import { MergedSetupSet } from "../../config/handler";

@injectable()
export class PromptState extends PromptStateMixin(PromptStateRequirements) {
  constructor(
    @inject(injectionNames.current.stateSetupSet) setupSet: MergedSetupSet,
    @inject(injectionNames.current.entityDictionary) entities: EntityDictionary,
    @inject(injectionNames.current.sessionFactory) sessionFactory: CurrentSessionFactory,
    @inject(injectionNames.userEntityMappings) mappings: PlatformGenerator.EntityMapping
  ) {
    super(setupSet, entities, sessionFactory, mappings);
  }

  /** Cancel the prompting and go on with main state */
  async cancelGenericIntent(machine: Transitionable) {
    this.prompt(this.t());
    return machine.transitionTo("MainState");
  }

  /** Override the translation convention */
  public async getPromptTranslationConvention() {
    const context = await this.unserializeHookContext<ValidationStrategy.Prompt>();
    return `.${context.validation.neededEntity}.${context.state}.${context.intent}`;
  }

  /** Override the suggestion chips translation convention */
  public async getSuggestionChipsTranslationConvention() {
    const context = await this.unserializeHookContext<ValidationStrategy.Prompt>();
    return `.suggestionChips.${context.validation.neededEntity}.${context.state}.${context.intent}`;
  }
}
```

To use your custom prompt state, either use the above mentioned `validationsInitializer` or pass it into your decorator using 
```typescript
@needsEntities({ entities: ["myEntitiy"], promptStateName: "MyCustomPromptState" }).
```
The procedure for the confirmation state is equivalent.

### Configuration

As listed in our [interfaces](src/components/validations/private-interfaces.ts), the only possible configuration options are `defaultPromptState` and `defaultConfirmationState`:

```typescript
/** Optional configuration settings */
export interface Defaults {
  /** Name of prompt state to use for all {@link needsEntities} validations as default */
  defaultPromptState: string;

  /** Name of confirmation state to use for all {@link needsConfirmation} validations as default state */
  defaultConfirmationState: string;
}

/** No configuration settings are required */
export interface Required {}
```

By passing these options you can overwrite the default prompt and confirmation states, which are then used in all decorator calls instead of the default states. Just merge our configuration interface `ValidationsConfigurationAttribute` with your existing AssistantJS configuration in `config/components.ts`.

[1]: http://assistantjs.org
[2]: https://github.com/webcomputing/AssistantJS/wiki/Getting-Started#step-2-explore-assistantjss-core-concepts
[3]: https://github.com/webcomputing/AssistantJS/wiki/Internationalization
