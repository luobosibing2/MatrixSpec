import YAML from "yaml";

const VERDICT_STAGES = new Set(["validation", "review"]);

export function parseStageVerdict(stageKey, content) {
  if (!VERDICT_STAGES.has(stageKey)) return { ok: true, required: false };

  const frontMatter = extractFrontMatter(content);
  if (frontMatter.present) {
    if (!frontMatter.ok) return frontMatter;
    const metadata = frontMatter.value?.matspec;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return invalidVerdict(stageKey, "YAML front matter must contain a matspec object.");
    }
    if (metadata.stage !== undefined && metadata.stage !== stageKey) {
      return invalidVerdict(stageKey, `matspec.stage must be ${stageKey}.`);
    }
    return normalizeStructuredVerdict(stageKey, metadata);
  }

  return parseLegacyVerdict(stageKey, content);
}

function extractFrontMatter(content) {
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/.exec(String(content || ""));
  if (!match) return { present: false };
  try {
    return { ok: true, present: true, value: YAML.parse(match[1]) };
  } catch (error) {
    return {
      ok: false,
      required: true,
      code: "STAGE_VERDICT_INVALID",
      message: `Invalid YAML front matter: ${error.message}`
    };
  }
}

function normalizeStructuredVerdict(stageKey, metadata) {
  const rawVerdict = String(metadata.verdict || "").trim().toLowerCase();
  const allowed = stageKey === "validation"
    ? new Set(["allow", "revise"])
    : new Set(["approved", "changes-required"]);
  if (!allowed.has(rawVerdict)) {
    return invalidVerdict(stageKey, `matspec.verdict must be one of: ${[...allowed].join(", ")}.`);
  }

  const blockers = normalizeBlockers(metadata.blockers);
  const reviseStages = normalizeStringList(metadata.reviseStages);
  const repairTarget = typeof metadata.repairTarget === "string" && metadata.repairTarget.trim()
    ? metadata.repairTarget.trim()
    : reviseStages[0] || null;
  const blocked = rawVerdict === "revise" || rawVerdict === "changes-required";
  if (blocked && blockers.length === 0) {
    return invalidVerdict(stageKey, "A blocking verdict must list at least one blocker.");
  }
  if (blocked && !repairTarget) {
    return invalidVerdict(stageKey, "A blocking verdict must provide repairTarget or reviseStages.");
  }

  return {
    ok: true,
    required: true,
    source: "structured",
    verdict: rawVerdict,
    blocked,
    blockers,
    reviseStages,
    repairTarget
  };
}

function parseLegacyVerdict(stageKey, content) {
  const text = String(content || "").replace(/[*_`]/g, "");
  if (stageKey === "validation") {
    const blocked = /(?:implementation may start|implementation permission|是否允许进入实现)\s*[:：]\s*(?:no|否)\b|revise before implementation|needs revision before implementation|实现前需修订/i.test(text);
    const allowed = /(?:implementation may start|implementation permission|是否允许进入实现)\s*[:：]\s*(?:yes|是)\b|\bimplementation may start\b|(?:总体结论|结论)\s*[:：]\s*(?:可进入实现|允许进入实现)/i.test(text);
    if (blocked && allowed) return conflictVerdict(stageKey);
    if (blocked) {
      return {
        ok: true,
        required: true,
        source: "legacy",
        verdict: "revise",
        blocked: true,
        blockers: ["Legacy validation verdict requires revision; add structured blocker details."],
        reviseStages: [],
        repairTarget: "tasks"
      };
    }
    if (allowed) return { ok: true, required: true, source: "legacy", verdict: "allow", blocked: false, blockers: [], reviseStages: [], repairTarget: null };
  } else {
    const blocked = /decision\s*[:：]\s*changes required\b|审查决策\s*[:：]\s*(?:需要修改|要求修改)/i.test(text);
    const allowed = /decision\s*[:：]\s*approved\b|审查决策\s*[:：]\s*(?:批准|通过)/i.test(text);
    if (blocked && allowed) return conflictVerdict(stageKey);
    if (blocked) {
      return {
        ok: true,
        required: true,
        source: "legacy",
        verdict: "changes-required",
        blocked: true,
        blockers: ["Legacy review verdict requires changes; add structured blocker details."],
        reviseStages: [],
        repairTarget: "implementation"
      };
    }
    if (allowed) return { ok: true, required: true, source: "legacy", verdict: "approved", blocked: false, blockers: [], reviseStages: [], repairTarget: null };
  }

  return {
    ok: false,
    required: true,
    code: "STAGE_VERDICT_MISSING",
    message: `${stageKey}.md must contain a machine-readable MatSpec verdict.`
  };
}

function normalizeStringList(value) {
  if (value === undefined || value === null) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeBlockers(value) {
  if (value === undefined || value === null) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => {
    if (typeof item === "string") return item.trim() ? [item.trim()] : [];
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    if (!id && !description) return [];
    return [{ ...(id ? { id } : {}), ...(description ? { description } : {}) }];
  });
}

function invalidVerdict(stageKey, message) {
  return { ok: false, required: true, code: "STAGE_VERDICT_INVALID", message: `${stageKey}.md: ${message}` };
}

function conflictVerdict(stageKey) {
  return {
    ok: false,
    required: true,
    code: "STAGE_VERDICT_CONFLICT",
    message: `${stageKey}.md contains conflicting allow and block decisions.`
  };
}
