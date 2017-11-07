## assistant-validations
assistant-validations is an [AssistantJS][1] component which gives you an easy way to validate entities in your voice application. Install assistant-validations with
 `npm install assistant-validations --save` and add it as an dependency to your `index.ts`:
```typescript
import { descriptor as validationsDescriptor, PromptState } from "assistant-validations";

/** and below, in your "initializeSetups" method: */
assistantJs.registerComponent(validationsDescriptor);
stateMachineSetup.addState(PromptState);
```
Notice that besides adding the component descriptor, you also have to register our `PromptState` as one of your application's states.

### Usage
assistant-validations gives you the `@need` decorator to define which entities you need for a specific intent or state. For example, if you need the entity `target` in your
`MainState` (as introduced in the [second chapter of the AssistantJS's viedeo tutorial][2]):
```typescript
import { stateMachineInterfaces, injectionNames, unifierInterfaces, i18nInterfaces } from "assistant-source";
import { needs } from "assistant-validations";
import { injectable, inject } from "inversify";

import { ApplicationState } from "./application";


@injectable()
export class MainState extends ApplicationState {

  constructor(
    @inject(injectionNames.current.responseFactory) responseFactory: unifierInterfaces.ResponseFactory,
    @inject(injectionNames.current.translateHelper) translateHelper: i18nInterfaces.TranslateHelper
  ) {
    super(responseFactory, translateHelper);
  }

  @needs("target")
  async busRouteIntent(machine: stateMachineInterfaces.Transitionable) {
    // ...
  }
}
```
Now, everytime the `busRouteIntent` of your `MainState` is called, assistant-validations forces AssistantJS to check if the entity `target` is present. If not, it prompts for this
entity and returns to the `busRouteIntent` as soon as the entity is given. This prompting is done by the internal assistant-validations `PromptState`.

assistant-validations adds the `answerPromptIntent` to your intent dictionary, and also automatically adds utterances for it. The `answerPromptIntent` is triggered if the user responds
with a plain entity value, for example if he or answers with "train station" to the question: "where do you want to go to?".

#### I18N integration
All intent methods implemented in our [states/prompt.ts](src/components/validations/states/prompt.ts) make use of the [AssistantJS's i18n conventions][3]. To differ between multiple entity
names, all `translateHelper` calls are appended by the prompted entity's name. For example, if you prompt for an entity name called "target", these rules would apply:

| Intent | Description | I18N key |
|------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------|
| invokeGenericIntent | Invoked automatically at prompt start. Message can be omitted using `promptFactory`. | promptState.invokeGenericIntent.target |
| unhandledGenericIntent | Invoked if the user fires an intent which is not handleable by the prompt state or if the given entity value does not fit to prompted the entity type. | promptState.unhandledGenericIntent.target |
| cancelGenericIntent | Invoked if the user says 'cancel' | promptState.cancelGenericIntent.target |
| stopGenericIntent | Invoked if the user says 'stop' | same as cancel |
| helpGenericIntent | Invoked if the user says 'help' | promptState.helpGenericIntent.target |
If you use a custom prompt state (see below), it's name will be used instead of `promptState` in all i18n keys.

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
import { stateMachineInterfaces, injectionNames, unifierInterfaces, i18nInterfaces } from "assistant-source";
import { needs, PromptFactory, Prompt } from "assistant-validations";
import { injectable, inject } from "inversify";

import { ApplicationState } from "./application";


@injectable()
export class MainState extends ApplicationState {
  currentPromptFactory: PromptFactory;

  constructor(
    @inject(injectionNames.current.responseFactory) responseFactory: unifierInterfaces.ResponseFactory,
    @inject(injectionNames.current.translateHelper) translateHelper: i18nInterfaces.TranslateHelper,
    @inject("validations:current-prompt-factory") currentPromptFactory: PromptFactory
  ) {
    super(responseFactory, translateHelper);
    this.currentPromptFactory = currentPromptFactory;
  }

  async busRouteIntent(machine: stateMachineInterfaces.Transitionable, ...args: any[]) {
    const promptInitializer = this.currentPromptFactory("busRouteIntent", "MainState", machine, "MyCustomPromptState", ...args);

    /** If "target" is missing / invalid ... */
    this.responseFactory.createVoiceResponse().prompt(this.translateHelper.t(".targetInvalid"));
    return promptInitializer.prompt("target", false);
  }
}
```
As you can see, using `promptFactory` forces you to pass the intent method and state name to return to, but is also gives you some additional options:
- You are able to specify a *custom prompt state*, which is used instead of the assistant-validations's default `PromptState` (here: `MyCustomPromptState`, see below for more information)
- You are able to add additioinal arguments which are then passed to the returning call of `busRouteIntent`
- You are able to omit the default voice response (by passing `false` as second argument to `promptInitializer.prompt`), which gives you the flexibility to send dynamic responses for your specific use cases

#### Using a custom prompt state
If you need more flexibility, you can also implement a custom prompt state. You can call your custom prompt state either for a specific entity (as stated above) or configure it to become the global default prompt state (as shown below). For example, this custom prompt state would redirect to MainState instead of aborting the conversation if a user fires a `cancelGenericIntent`:
```typescript
import { PromptState } from "assistant-validations";
import { injectable, inject } from "inversify";

export class MyCustomPromptState extends PromptState {

  /** Cancel the prompting and go on with main state */
  async cancelGenericIntent(machine: stateMachineInterfaces.Transitionable) {
    this.responseFactory.createVoiceResponse().prompt(this.i18n.t());
    return machine.transitionTo("MainState");
  }
}
```

### Configuration
As listed in our [interfaces.ts](src/components/validations/interfaces.ts), the only possible configuration option is `defaultPromptState`:
```typescript
export interface OptionalConfiguration {
  defaultPromptState?: string;
}
```
By passing this option you can overwrite the default prompt state, which is then used in all `@need` calls instead of `PromptState`.

[1]: http://assistantjs.org
[2]: https://github.com/webcomputing/AssistantJS/wiki/Getting-Started#step-2-explore-assistantjss-core-concepts
[3]: https://github.com/webcomputing/AssistantJS/wiki/Internationalization