import { CurrentSessionFactory, GenericIntent, injectionNames, Session, State, Transitionable } from "assistant-source";
import { Component, getMetaInjectionName } from "inversify-components";
import { COMPONENT_NAME, Configuration } from "../../src/components/validations/private-interfaces";
import { sessionKeys } from "../../src/components/validations/public-interfaces";
import { PromptTransition } from "../../src/components/validations/transitions/prompt-transition";
import { ThisContext } from "../this-context";

interface CurrentThisContext extends ThisContext {
  machine: Transitionable;
  promptTransition: PromptTransition;
  currentStateProvider: State.CurrentProvider;
  configuration: Configuration.Runtime;
  currentSession: Session;
  intent: string;
  state: string;

  /** Calls promptTransition.transition() and registers all spies */
  callTransitionAndRegisterSpies(
    promptStateName?: string | undefined,
    additionalArguments?: any[],
    tellInvokeMessage?: boolean,
    entityName?: string
  ): Promise<void>;
}

describe("PromptTransition", function() {
  beforeEach(async function(this: CurrentThisContext) {
    this.intent = "testIntent";
    this.state = "MainState";

    this.callTransitionAndRegisterSpies = async (
      promptStateName?: string | undefined,
      additionalArguments = [],
      tellInvokeMessage = true,
      entityName = "city"
    ) => {
      // Create request scope
      await this.specHelper.prepareIntentCall(this.platforms.google, "test");

      // Get some injections
      this.machine = this.inversify.get(injectionNames.current.stateMachine);
      this.promptTransition = this.inversify.get<PromptTransition>(PromptTransition);
      this.currentStateProvider = this.inversify.get<State.CurrentProvider>(injectionNames.current.stateProvider);
      this.configuration = this.inversify.get<Component<Configuration.Runtime>>(getMetaInjectionName(COMPONENT_NAME)).configuration;
      this.currentSession = this.inversify.get<CurrentSessionFactory>(injectionNames.current.sessionFactory)();

      // Register spies
      spyOn(this.machine, "redirectTo").and.callThrough();

      // Call transition function
      const usedPromptStateName = promptStateName || this.configuration.defaultPromptState;
      await this.promptTransition.transition(entityName, this.state, this.intent, additionalArguments, usedPromptStateName, tellInvokeMessage);
    };
  });

  describe("transition()", function() {
    describe("with PromptState configured", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.prepareWithStates();
      });

      it("transitions to PromptState", async function(this: CurrentThisContext) {
        await this.callTransitionAndRegisterSpies();

        const currentState = await this.currentStateProvider();
        expect(currentState.name).toEqual("PromptState");
      });

      describe("regarding the transition's context", function() {
        it("saves entity in an PromptContext to session", async function(this: CurrentThisContext) {
          await this.callTransitionAndRegisterSpies();
          const context = (await this.currentSession.get(sessionKeys.context)) as string;
          expect(JSON.parse(context)).toEqual({
            intent: this.intent,
            state: this.state,
            validation: { neededEntity: "city", type: "prompt" },
            redirectArguments: [],
          });
        });

        it("stores additional arguments in transition context", async function(this: CurrentThisContext) {
          await this.callTransitionAndRegisterSpies(undefined, ["additionalArg1", "additionalArg2"]);

          const context = (await this.currentSession.get(sessionKeys.context)) as string;
          expect(JSON.parse(context).redirectArguments).toEqual(["additionalArg1", "additionalArg2"]);
        });
      });

      describe("using tellInvokeMessage = true", function() {
        beforeEach(async function(this: CurrentThisContext) {
          await this.callTransitionAndRegisterSpies();
        });

        it("calls machine.redirectTo with tellInvokeMessage = true", async function(this: CurrentThisContext) {
          expect(this.machine.redirectTo).toHaveBeenCalledWith("PromptState", GenericIntent.Invoke, true);
        });
      });

      describe("using tellInvokeMessage = false", function() {
        beforeEach(async function(this: CurrentThisContext) {
          await this.callTransitionAndRegisterSpies(undefined, [], false);
        });

        it("calls machine.redirectTo with tellInvokeMessage = true", async function(this: CurrentThisContext) {
          expect(this.machine.redirectTo).toHaveBeenCalledWith("PromptState", GenericIntent.Invoke, false);
        });
      });

      describe("with promptStateName set to 'MyPromptState'", function() {
        beforeEach(async function(this: CurrentThisContext) {
          await this.callTransitionAndRegisterSpies("MyPromptState");
        });

        it("transitions to MyPromptState instead", async function(this: CurrentThisContext) {
          const currentState = await this.currentStateProvider();
          expect(currentState.name).toEqual("MyPromptState");
        });
      });
    });

    describe("with changed configuration", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.assistantJs.addConfiguration({
          validations: {
            defaultPromptState: "MyPromptState",
          },
        });

        this.prepareWithStates();
        await this.callTransitionAndRegisterSpies();
      });

      it("transitions to configured prompt state instead", async function(this: CurrentThisContext) {
        const currentState = await this.currentStateProvider();
        expect(currentState.name).toEqual("MyPromptState");
      });
    });

    describe("without PromptState configured", function() {
      beforeEach(async function(this: CurrentThisContext) {
        this.specHelper.prepareSpec(this.defaultSpecOptions);
      });

      it("throws an exception", async function(this: CurrentThisContext) {
        try {
          await this.callTransitionAndRegisterSpies();
          expect(true).toBeFalsy();
        } catch (e) {
          expect(true).toBeTruthy();
        }
      });
    });
  });
});
