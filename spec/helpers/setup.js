require("reflect-metadata");
const assistantJsCore = require("assistant-source");
const google = require("assistant-google");
const apiai = require("assistant-apiai");
const ownComponent = require("../../src/components/validations/descriptor");

const mainState = require("../support/mocks/states/main").MainState;
const promptState = require("../support/mocks/states/prompt").PromptState;
const myPromptState = require("../support/mocks/states/my-prompt").MyPromptState;

beforeEach(function() {
  this.assistantJs = new assistantJsCore.AssistantJSSetup();
  this.specHelper = new assistantJsCore.SpecHelper(this.assistantJs);

  this.assistantJs.registerComponent(google.descriptor);
  this.assistantJs.registerComponent(apiai.descriptor);
  this.assistantJs.registerComponent(ownComponent.descriptor);

  this.prepareWithStates = () => {
    this.specHelper.prepare([mainState, promptState, myPromptState]);
  };

  this.assistantJs.addConfiguration({
    "core:i18n": {
      i18nextAdditionalConfiguration: {
        backend: {
          loadPath: process.cwd() + "/spec/support/mocks/locales/{{lng}}/{{ns}}.json",
        },
      },
    },
    "core:unifier": {
      entities: {
        myEntityType: ["city", "country"],
      },
    },
  });

  this.container = this.assistantJs.container;

  this.googleSpecHelper = new google.GoogleSpecHelper(this.specHelper);
});
