import { AssistantJSSetup, UnifierConfiguration } from "assistant-source";
import { UtteranceTemplateService } from "../src/components/validations/utterance-template-service";

describe("UtteranceTemplateService", function() {
  beforeEach(function() {
    this.prepareWithStates();
  });

  const config: UnifierConfiguration = {
    entities: {
      number: ["amount", "pin"],
      givenName: ["receiver"],
    },
  };
  let templateService: UtteranceTemplateService;

  beforeEach(function() {
    this.assistantJs.addConfiguration({ "core:unifier": config });
    this.assistantJs.configure();
    const componentInterface = (this.assistantJs as AssistantJSSetup).container.componentRegistry
      .lookup("core:unifier")
      .getInterface("utteranceTemplateService");
    templateService = this.inversify.get(componentInterface);
  });

  describe("getUtteranceFor", function() {
    it("responds with prompting utterance for each entity", function() {
      expect(templateService.getUtterancesFor("de")).toEqual({
        answerPromptIntent: ["{{number}}", "{{givenName}}"],
      });
    });
  });
});
