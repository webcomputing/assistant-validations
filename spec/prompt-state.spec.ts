// tslint:disable-next-line:no-implicit-dependencies
import { GoogleSpecificHandable, GoogleSpecificTypes } from "assistant-google";
import { CurrentSessionFactory, EntityDictionary, GenericIntent, injectionNames, intent as Intent, Session, Transitionable } from "assistant-source";
import { ThisContext } from "./this-context";

interface CurrentThisContext extends ThisContext {
  currentSession: Session;
  responseHandler: GoogleSpecificHandable<GoogleSpecificTypes>;
  stateMachine: Transitionable;
  entityDictionary: EntityDictionary;
  responseHandlerResults: Partial<GoogleSpecificTypes>;
  setHookContext(): Promise<void>;
  callIntent(
    intent: Intent,
    callMachine?: boolean,
    setContext?: boolean,
    state?: string,
    getResults?: boolean,
    entities?: any
  ): Promise<GoogleSpecificHandable<GoogleSpecificTypes>>;
}

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

  beforeEach(async function(this: CurrentThisContext) {
    this.prepareWithStates();

    this.callIntent = async (intent, callMachine = true, setContext = true, state = "PromptState", getResults: boolean = true, entities: any = undefined) => {
      const currentEntities = typeof entities === "undefined" ? defaultEntities : entities;
      const responseHandler = await this.googleSpecHelper.pretendIntentCalled(intent, { entities: currentEntities });

      this.currentSession = this.container.inversifyInstance.get<CurrentSessionFactory>(injectionNames.current.sessionFactory)();

      if (setContext) {
        await this.setHookContext();
      }

      if (callMachine) {
        await this.specHelper.runMachine(state);
      }

      if (getResults) {
        this.responseHandlerResults = this.specHelper.getResponseResults();
      }

      return responseHandler;
    };

    this.setHookContext = () => {
      const session = this.container.inversifyInstance.get<CurrentSessionFactory>(injectionNames.current.sessionFactory)();
      return session.set("entities:currentPrompt", JSON.stringify(hookContext));
    };
  });

  describe("cancelGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.Cancel);
    });

    it("returns general cancel text", async function(this: CurrentThisContext) {
      expect(this.responseHandlerResults.voiceMessage!.text).toEqual("See you!");
      expect(this.responseHandlerResults.shouldSessionEnd).toBeTruthy();
    });
  });

  describe("stopGenericIntent", function() {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.Stop);
    });

    it("returns general cancel text", async function(this: CurrentThisContext) {
      expect(this.responseHandlerResults.voiceMessage!.text).toEqual("See you!");
      expect(this.responseHandlerResults.shouldSessionEnd).toBeTruthy();
    });
  });

  describe("unansweredGenericIntent", async function(this: CurrentThisContext) {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.Unanswered);
    });

    it("returns an empty response", async function(this: CurrentThisContext) {
      expect(this.responseHandlerResults.voiceMessage).not.toBeUndefined();
      expect(this.responseHandlerResults.voiceMessage!.text).toBe("");
      expect(this.responseHandlerResults.shouldSessionEnd).toBeTruthy();
    });
  });

  describe("helpGenericIntent", async function(this: CurrentThisContext) {
    beforeEach(async function(this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.Help);
    });

    it("returns specific help text", async function(this: CurrentThisContext) {
      expect(this.responseHandlerResults.voiceMessage!.text).toEqual("Help for city");
      expect(this.responseHandlerResults.shouldSessionEnd).toBeFalsy();
    });
  });

  describe("unhandledIntent", function() {
    answerPromptBehaviour("notExisting");
  });

  describe("invokeGenericIntent", function() {
    describe("without suggestion chips", function() {
      beforeEach(async function(this: CurrentThisContext) {
        hookContext.neededEntity = "country";
        this.responseHandler = await this.callIntent(GenericIntent.Invoke, true, true, "PromptState");
      });

      afterEach(function() {
        hookContext.neededEntity = "city";
      });

      it("does not add any suggestionchips", async function(this: CurrentThisContext) {
        expect(this.responseHandlerResults.suggestionChips).toBeUndefined();
      });
    });

    describe("with defined hook context", async function(this: CurrentThisContext) {
      beforeEach(async function(this: CurrentThisContext) {
        this.responseHandler = await this.callIntent(GenericIntent.Invoke, true, true, "PromptState");
      });

      it("returns the invoke text as prompt", async function(this: CurrentThisContext) {
        expect(this.responseHandlerResults.voiceMessage!.text).toEqual("Prompt for city");
        expect(this.responseHandlerResults.shouldSessionEnd).toBeFalsy();
      });

      it("adds suggestion chips", async function(this: CurrentThisContext) {
        expect(this.responseHandlerResults.suggestionChips).toEqual(["Münster", "München"]);
      });

      it("stores current entities to session", async function(this: CurrentThisContext) {
        const storedEntities = await this.currentSession.get("entities:currentPrompt:previousEntities");
        expect(JSON.parse(storedEntities!).myEntity).toEqual("myValue");
      });
    });

    describe("with no hook context defined", function() {
      it("throws an exception", async function(this: CurrentThisContext) {
        try {
          await this.callIntent(GenericIntent.Invoke, true, false, "PromptState");
          fail("run machine has to throw an error");
        } catch (e) {
          expect(false).toBeFalsy();
        }
      });
    });
  });

  describe("answerPromptIntent", function() {
    answerPromptBehaviour("answerPrompt");
  });

  function answerPromptBehaviour(intentName: Intent) {
    describe("with the prompted entity given", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.responseHandler = await this.callIntent(intentName, false, true, "PromptState", false, { myEntityType: "Münster" });
        await this.currentSession.set("entities:currentPrompt:previousEntities", JSON.stringify(defaultEntities));

        this.entityDictionary = this.container.inversifyInstance.get(injectionNames.current.entityDictionary);
        this.stateMachine = this.container.inversifyInstance.get(injectionNames.current.stateMachine);

        spyOn(this.stateMachine, "handleIntent").and.callThrough();

        await this.specHelper.runMachine("PromptState");
      });

      it("puts needed entity in entity dictionary", async function(this: CurrentThisContext) {
        const test = await this.entityDictionary.get("city");
        expect(test).toEqual("Münster");
      });

      it("puts saved entities in entity dictionary", async function(this: CurrentThisContext) {
        expect(await this.entityDictionary.get("myEntity")).toEqual("myValue");
        expect(await this.entityDictionary.get("myEntity2")).toEqual("myValue2");
      });

      it("redirects to state/intent stored in hook context", async function(this: CurrentThisContext) {
        expect(this.stateMachine.handleIntent).toHaveBeenCalledWith("test", ...hookContext.redirectArguments);
      });
    });

    describe("with the prompted entity not given", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.responseHandler = await this.callIntent(intentName);
      });

      it("returns unhandledIntent result", async function(this: CurrentThisContext) {
        expect(this.responseHandlerResults.voiceMessage).not.toBeUndefined();
        expect(this.responseHandlerResults.voiceMessage!.text).toEqual("Prompt for city");
        expect(this.responseHandlerResults.shouldSessionEnd).toBeFalsy();
      });
    });
  }
});
