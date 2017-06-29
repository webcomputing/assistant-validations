import { unifierInterfaces } from "assistant-source";
import { UtteranceTemplateService } from "../src/components/validations/utterance-template-service";

describe("UtteranceTemplateService", function() {
  beforeEach(function() {
    this.prepareWithStates();
  });

  let config: unifierInterfaces.Configuration = {
    entities: {
      number: ["amount", "pin"],
      givenName: ["receiver"]
    }
  }
  let templateService: UtteranceTemplateService;

  beforeEach(function() {
    this.assistantJs.addConfiguration({ "core:unifier": config });
    this.assistantJs.configure();
    templateService = this.container.inversifyInstance.get(unifierInterfaces.componentInterfaces.utteranceTemplateService);
  });

  describe("getUtteranceFor", function() {
    it("responds with prompting utterance for each entitiy", function() {
      expect(templateService.getUtterancesFor("de")).toEqual({
        "answerPromptIntent": ["{{number}}", "{{givenName}}"]
      });
    });
  });
});