require("reflect-metadata");
const assistantJsCore = require("assistant-source");
const alexa = require("assistant-alexa");
const ownComponent = require("../../src/components/validations/descriptor");

const mainState = require("../support/mocks/states/main").MainState;
const promptState = require("../support/mocks/states/prompt").PromptState;
const myPromptState = require("../support/mocks/states/my-prompt").MyPromptState;


beforeEach(function() {
  this.specHelper = new assistantJsCore.SpecSetup();

  this.assistantJs = this.specHelper.setup;
  this.assistantJs.registerComponent(alexa.descriptor);
  this.assistantJs.registerComponent(ownComponent.descriptor);

  this.prepareWithStates = () => {
    this.specHelper.prepare([
      mainState,
      promptState,
      myPromptState
    ]);
  }

  this.assistantJs.addConfiguration({
    "core:i18n": {
      "i18nextAdditionalConfiguration": {
        "backend": {
          "loadPath": process.cwd() + "/spec/support/mocks/locales/{{lng}}/{{ns}}.json"
        }
      }
    },
    "core:unifier": {
      "entities": {
        "myEntityType": ["city"]
      }
    }
  });

  this.container = this.assistantJs.container;

  this.alexaHelper = new alexa.SpecHelper(this.specHelper);
});