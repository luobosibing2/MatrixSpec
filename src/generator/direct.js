import fs from "node:fs";
import path from "node:path";
import { fakeCompletion } from "../llm.js";
import { ensureDir, rel, writeJson } from "../util.js";
import { commonOutputRules, readFullTemplates, repositoryEvidence, specBlackBoxRules } from "./templates.js";

export function runDirectGeneration({ paths, run, scan, plan, strategy, options = {} }) {
  const promptsDir = path.join(run.dir, "logs/prompts");
  ensureDir(promptsDir);

  const designPrompt = buildDesignPrompt(scan, plan, options);
  const designPromptFile = path.join(promptsDir, "design.md");
  fs.writeFileSync(designPromptFile, designPrompt, "utf8");

  const designResult = fakeCompletion({
    task: "design",
    prompt: designPrompt,
    plan,
    model: strategy.model,
    options
  });
  const design = designResult.text;

  const specPrompt = buildSpecPrompt(design, options);
  const specPromptFile = path.join(promptsDir, "spec.md");
  fs.writeFileSync(specPromptFile, specPrompt, "utf8");

  const specResult = fakeCompletion({
    task: "spec",
    prompt: specPrompt,
    plan,
    design,
    model: strategy.model,
    options
  });

  const llmLog = {
    provider: strategy.provider,
    model: strategy.model,
    generationMode: strategy.generationMode,
    calls: [
      {
        task: "design",
        prompt: rel(run.dir, designPromptFile),
        usage: designResult.usage
      },
      {
        task: "spec",
        prompt: rel(run.dir, specPromptFile),
        usage: specResult.usage,
        derivedFrom: "design.md"
      }
    ],
    tokens: {
      input: designResult.usage.input + specResult.usage.input,
      output: designResult.usage.output + specResult.usage.output
    }
  };
  const llmLogFile = path.join(run.dir, "logs/llm.json");
  writeJson(llmLogFile, llmLog);

  return {
    design,
    spec: specResult.text,
    logs: {
      llm: rel(run.dir, llmLogFile),
      prompts: {
        design: rel(run.dir, designPromptFile),
        spec: rel(run.dir, specPromptFile)
      }
    },
    tokens: llmLog.tokens,
    provider: strategy.provider,
    model: strategy.model
  };
}

function buildDesignPrompt(scan, plan, options = {}) {
  const templates = readFullTemplates(options);
  return `${commonOutputRules(options)}

You are the MatSpec direct design.md generation runner.
Task: generate a whole-project design.md from the scan and module plan.

Template requirements:
1. Strictly use the main section structure and headings from the DESIGN template below.
2. Preserve the section meaning, but replace placeholders with real project content.
3. Do not delete non-applicable sections; write "No explicit design" or "To be confirmed" and explain the basis.

DESIGN template:
${templates.design}

Project: ${plan.projectName}
Language: ${plan.language || "unknown"}
Primary extension: ${plan.primaryExtension || "unknown"}

Modules:
${plan.modules.map((module) => `- ${module.name}: ${module.path} - ${module.description}`).join("\n")}

README files:
${scan.readmeFiles.map((file) => `- ${file.path}`).join("\n") || "- none"}

Docs files:
${scan.docsFiles.map((file) => `- ${file.path}`).join("\n") || "- none"}

Repository evidence:
${repositoryEvidence(scan)}

File tree:
${scan.fileTree}
`;
}

function buildSpecPrompt(design, options = {}) {
  const templates = readFullTemplates(options);
  return `${commonOutputRules(options)}

You are the MatSpec direct spec.md generation runner.
Task: derive the SPEC only from the generated design.md.

${specBlackBoxRules(options)}

Template requirements:
1. Strictly use the main section structure and headings from the SPEC template below.
2. Preserve these sections: Component Purpose, Domain Terminology, Actors and Boundaries, DFX Constraints, Core Capabilities, Data Constraints.
3. Replace placeholders with business language; do not keep placeholder text such as "[Component Name]" or "[Capability Name]".
4. Do not output the guidance from SPEC-annotated; output only the final SPEC body.

SPEC template:
${templates.spec}

SPEC methodology reference:
${templates.specAnnotated}

Generated design.md:
${design}
`;
}
