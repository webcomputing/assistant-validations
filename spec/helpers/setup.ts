// tslint:disable-next-line
require("reflect-metadata");

import { descriptor as apiAiDescriptor } from "assistant-apiai";
import { descriptor as googleDescriptor, GoogleSpecHelper } from "assistant-google";
import { AssistantJSSetup, injectionNames, SpecHelper, StateMachineSetup } from "assistant-source";
import { descriptor } from "../../src/assistant-validations";
import { ConfirmationState } from "../support/mocks/states/confirmation-state";
import { MainState } from "../support/mocks/states/main-state";
import { MyConfirmationState } from "../support/mocks/states/my-confirmation-state";
import { MyPromptState } from "../support/mocks/states/my-prompt-state";
import { PromptState } from "../support/mocks/states/prompt-state";
import { ThisContext } from "../this-context";

beforeEach(function(this: ThisContext) {
  this.assistantJs = new AssistantJSSetup();
  this.stateMachineSetup = new StateMachineSetup(this.assistantJs);
  this.specHelper = new SpecHelper(this.assistantJs, this.stateMachineSetup);

  this.assistantJs.registerInternalComponents();
  this.assistantJs.registerComponent(googleDescriptor);
  this.assistantJs.registerComponent(apiAiDescriptor);
  this.assistantJs.registerComponent(descriptor);

  this.prepareWithStates = () => {
    [MainState, PromptState, MyPromptState, ConfirmationState, MyConfirmationState].forEach(state => this.stateMachineSetup.addState(state));
    this.stateMachineSetup.registerStates();
    this.specHelper.prepareSpec(this.defaultSpecOptions);
  };

  this.assistantJs.addConfiguration({
    "core:i18n": {
      i18nextAdditionalConfiguration: {
        backend: {
          loadPath: `${process.cwd()}/spec/support/mocks/locales/{{lng}}/{{ns}}.json`,
        },
      },
    },
    "core:unifier": {
      entities: {
        myEntityType: ["city", "country"],
        mySecondEntityType: ["amount"],
      },
    },
  });

  this.defaultSpecOptions = {};
  this.inversify = this.assistantJs.container.inversifyInstance;

  this.translateValuesForGetter = () => this.inversify.get(injectionNames.current.i18nTranslateValuesFor);

  this.platforms = {
    google: new GoogleSpecHelper(this.specHelper),
  };
});
