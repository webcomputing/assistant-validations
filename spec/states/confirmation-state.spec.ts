/*
import { GoogleSpecificHandable, GoogleSpecificTypes } from "assistant-google";
import { CurrentSessionFactory, EntityDictionary, GenericIntent, injectionNames, intent as Intent, Session, Transitionable } from "assistant-source";
import { HookContext, sessionKeys, ValidationStrategy } from "../../src/assistant-validations";
import { ThisContext } from "../this-context";

interface CurrentThisContext extends ThisContext {
  currentSession: Session;
  responseHandler: GoogleSpecificHandable<GoogleSpecificTypes>;
  stateMachine: Transitionable;
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

describe("ConfirmationState", function () {

  const hookContext: HookContext<ValidationStrategy.Confirmation> = {
    intent: "testIntent",
    state: "MainState",
    validation: {
      type: "confirmation",
    },
    redirectArguments: ["a1", "b2"],
  };

  beforeEach(async function (this: CurrentThisContext) {
    this.prepareWithStates();

    this.callIntent = async (intent, callMachine = true, setContext = true, state = "ConfirmationState", getResults: boolean = true) => {
      const responseHandler = this.specHelper.prepareIntentCall(this.platforms.google, intent);

      this.currentSession = this.inversify.get<CurrentSessionFactory>(injectionNames.current.sessionFactory)();

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
      const session = this.inversify.get<CurrentSessionFactory>(injectionNames.current.sessionFactory)();
      return session.set(sessionKeys.confirmation.context, JSON.stringify(hookContext));
    };
  });

  describe("cancelGenericIntent", function () {
    beforeEach(async function (this: CurrentThisContext) {
      this.responseHandler = await this.callIntent(GenericIntent.Cancel);
    });

    it("returns general cancel text", async function (this: CurrentThisContext) {
      expect(this.responseHandlerResults.voiceMessage!.text).toEqual("See you!");
      expect(this.responseHandlerResults.shouldSessionEnd).toBeTruthy();
    });
  });
});
 */