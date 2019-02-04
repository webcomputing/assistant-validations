// tslint:disable-next-line
require("reflect-metadata");

import { descriptor as apiAiDescriptor } from "assistant-apiai";
import { descriptor as googleDescriptor, GoogleSpecHelper } from "assistant-google";
import { AssistantJSSetup, SpecHelper } from "assistant-source";
import { descriptor } from "../../src/assistant-validations";
import { MainState } from "../support/mocks/states/main";
import { MyPromptState } from "../support/mocks/states/my-prompt";
import { PromptState } from "../support/mocks/states/prompt";
import { ThisContext } from "../this-context";

beforeEach(function(this: ThisContext) {
  this.assistantJs = new AssistantJSSetup();
  this.specHelper = new SpecHelper(this.assistantJs);

  this.assistantJs.registerComponent(googleDescriptor);
  this.assistantJs.registerComponent(apiAiDescriptor);
  this.assistantJs.registerComponent(descriptor);

  this.prepareWithStates = () => {
    this.specHelper.prepare([MainState, PromptState, MyPromptState]);
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

  this.container = this.assistantJs.container;

  this.googleSpecHelper = new GoogleSpecHelper(this.specHelper);
});
