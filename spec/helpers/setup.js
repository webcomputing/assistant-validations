require("reflect-metadata");
let assistantJsCore = require("assistant-source");
let alexa = require("assistant-alexa");
let ownComponent = require("../../src/components/validations/descriptor");

let mainState = require("../support/mocks/states/main").MainState;
let promptState = require("../../src/components/validations/states/prompt").PromptState;


beforeEach(function() {
  this.specHelper = new assistantJsCore.SpecSetup();

  this.assistantJs = this.specHelper.setup;
  this.assistantJs.registerComponent(alexa.descriptor);
  this.assistantJs.registerComponent(ownComponent.descriptor);

  this.prepareWithStates = () => {
    this.specHelper.prepare([
      mainState,
      promptState
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