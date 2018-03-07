import { injectable, inject } from "inversify";
import { PlatformGenerator } from "assistant-source";

@injectable()
export class UtteranceTemplateService implements PlatformGenerator.UtteranceTemplateService {
  private mappings: PlatformGenerator.EntityMapping;

  constructor(@inject("core:unifier:user-entity-mappings") mappings: PlatformGenerator.EntityMapping) {
    this.mappings = mappings;
  }

  getUtterancesFor(langauge: string) {
    return {
      answerPromptIntent: this.getUniqueMappingValues().map(type => "{{" + type + "}}")
    };
  }

  getUniqueMappingValues() {
    let values = Object.keys(this.mappings).map(key => this.mappings[key]);
    return Array.from(new Set(values));
  }
}