import { GenericIntent, injectionNames, intent as IntentType } from "assistant-source";

describe("PromptState", function() {
  const defaultEntities = {
    myEntity: "myValue",
    myEntity2: "myValue2",
  };
  const hookContext = {
    intent: "testIntent",
    state: "MainState",
    neededEntity: "city",
    redirectArguments: ["a1", "b2"],
  };

  beforeEach(function() {
    this.prepareWithStates();

    this.callIntent = async (intent, callMachine = true, setContext = true, state = "PromptState", entities: any = undefined) => {
      const currentEntities = typeof entities === "undefined" ? defaultEntities : entities;
      const responseHandle = await this.alexaHelper.pretendIntentCalled(intent, false, { entities: currentEntities });

      this.currentSession = this.container.inversifyInstance.get(injectionNames.current.sessionFactory)();

      if (setContext) {
        await this.setHookContext();
      }

      if (callMachine) {
        await this.specHelper.runMachine(state);
      }
      return responseHandle;
    };

    this.setHookContext = () => {
      const session = this.container.inversifyInstance.get(injectionNames.current.sessionFactory)();
      return session.set("entities:currentPrompt", JSON.stringify(hookContext));
    };
  });

  describe("cancelGenericIntent", function() {
    beforeEach(async function(done) {
      this.responseHandler = await this.callIntent(GenericIntent.Cancel);
      done();
    });

    it("returns general cancel text", function() {
      expect(this.responseHandler.voiceMessage).toEqual("See you!");
      expect(this.responseHandler.endSession).toBeTruthy();
    });
  });

  describe("stopGenericIntent", function() {
    beforeEach(async function(done) {
      this.responseHandler = await this.callIntent(GenericIntent.Stop);
      done();
    });

    it("returns general cancel text", function() {
      expect(this.responseHandler.voiceMessage).toEqual("See you!");
      expect(this.responseHandler.endSession).toBeTruthy();
    });
  });

  describe("unansweredGenericIntent", function() {
    beforeEach(async function(done) {
      this.responseHandler = await this.callIntent(GenericIntent.Unanswered);
      done();
    });

    it("returns an empty response", function() {
      expect(this.responseHandler.voiceMessage).toEqual("");
      expect(this.responseHandler.endSession).toBeTruthy();
    });
  });

  describe("helpGenericIntent", function() {
    beforeEach(async function(done) {
      this.responseHandler = await this.callIntent(GenericIntent.Help);
      done();
    });

    it("returns specific help text", function() {
      expect(this.responseHandler.voiceMessage).toEqual("Help for city");
      expect(this.responseHandler.endSession).toBeFalsy();
    });
  });

  describe("unhandledIntent", function() {
    answerPromptBehaviour("notExisting");
  });

  describe("invokeGenericIntent", function() {
    beforeEach(async function(done) {
      this.responseHandler = await this.callIntent(GenericIntent.Invoke, false, false);
      done();
    });

    describe("with defined hook context", function() {
      beforeEach(async function(done) {
        await this.setHookContext();
        await this.specHelper.runMachine("PromptState");
        done();
      });

      it("returns the invoke text as prompt", function() {
        expect(this.responseHandler.voiceMessage).toEqual("Prompt for city");
        expect(this.responseHandler.endSession).toBeFalsy();
      });

      it("stores current entities to session", async function(done) {
        const storedEntities = await this.currentSession.get("entities:currentPrompt:previousEntities");
        expect(JSON.parse(storedEntities).myEntity).toEqual("myValue");
        done();
      });
    });

    describe("with no hook context defined", function() {
      it("throws an exception", async function(done) {
        try {
          await this.specHelper.runMachine("PromptState");
          fail("run machine has to throw an error");
        } catch (e) {
          expect(false).toBeFalsy();
        }
        done();
      });
    });
  });

  describe("answerPromptIntent", function() {
    answerPromptBehaviour("answerPrompt");
  });

  function answerPromptBehaviour(intentName: IntentType) {
    describe("with the prompted entity given", function() {
      beforeEach(async function(done) {
        this.responseHandler = await this.callIntent(intentName, false, true, "PromptState", { myEntityType: "Münster" });
        await this.currentSession.set("entities:currentPrompt:previousEntities", JSON.stringify(defaultEntities));

        this.entityDictionary = this.container.inversifyInstance.get(injectionNames.current.entityDictionary);
        this.stateMachine = this.container.inversifyInstance.get(injectionNames.current.stateMachine);

        spyOn(this.stateMachine, "handleIntent").and.callThrough();

        await this.specHelper.runMachine("PromptState");
        done();
      });

      it("puts needed entity in entity dictionary", async function(done) {
        const test = await this.entityDictionary.get("city");
        expect(test).toEqual("Münster");
        done();
      });

      it("puts saved entities in entity dictionary", async function() {
        expect(await this.entityDictionary.get("myEntity")).toEqual("myValue");
        expect(await this.entityDictionary.get("myEntity2")).toEqual("myValue2");
      });

      it("redirects to state/intent stored in hook context", function() {
        expect(this.stateMachine.handleIntent).toHaveBeenCalledWith("test", ...hookContext.redirectArguments);
      });
    });

    describe("with the prompted entity not given", function() {
      beforeEach(async function(done) {
        this.responseHandler = await this.callIntent(intentName);
        done();
      });

      it("returns unhandledIntent result", function() {
        expect(this.responseHandler.voiceMessage).toEqual("Prompt for city");
        expect(this.responseHandler.endSession).toBeFalsy();
      });
    });
  }
});
