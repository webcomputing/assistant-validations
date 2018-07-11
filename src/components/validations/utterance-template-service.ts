import { PlatformGenerator } from "assistant-source";
import { inject, injectable } from "inversify";

@injectable()
export class UtteranceTemplateService implements PlatformGenerator.UtteranceTemplateService {
  private mappings: PlatformGenerator.EntityMapping;

  constructor(@inject("core:unifier:user-entity-mappings") mappings: PlatformGenerator.EntityMapping) {
    this.mappings = mappings;
  }

  public getUtterancesFor(langauge: string) {
    return {
      answerPromptIntent: this.getUniqueMappingValues().map(type => "{{" + type + "}}"),
    };
  }

  public getUniqueMappingValues() {
    const values = Object.keys(this.mappings).map(key => this.mappings[key]);
    return Array.from(new Set(values));
  }
}
