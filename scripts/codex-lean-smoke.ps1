param(
    [string]$Model = "gpt-5.6-terra",
    [string]$ReasoningEffort = "high",
    [string]$RunRoot,
    [switch]$UseFixtureSpec
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sourceRoot = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
if (-not $RunRoot) {
    $RunRoot = Join-Path $sourceRoot ".scratch/lean-smoke/$stamp"
}
$runRootPath = [System.IO.Path]::GetFullPath($RunRoot)
$scratchRoot = [System.IO.Path]::GetFullPath((Join-Path $sourceRoot ".scratch"))
if (-not $runRootPath.StartsWith($scratchRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "RunRoot must stay under $scratchRoot"
}

$workspace = Join-Path $runRootPath "workspace"
$logs = Join-Path $runRootPath "logs"
$harnessBin = Join-Path $runRootPath "bin"
New-Item -ItemType Directory -Force -Path $workspace, $logs, $harnessBin | Out-Null

$packageJson = @'
{
  "name": "matspec-lean-smoke-fixture",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
'@
$source = @'
export function slugify(value) {
    if (typeof value !== "string") return "";
    return value.toLowerCase();
}
'@
$test = @'
import test from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/slug.js";

test("lowercases labels", () => {
    assert.equal(slugify("Hello"), "hello");
});

test("keeps the existing non-string fallback", () => {
    assert.equal(slugify(null), "");
});
'@
$agents = @'
# Smoke fixture rules

- Do not use the network or browse external sources.
- Preserve the public `slugify(value)` signature and existing non-string fallback.
- Use the installed MatSpec workflow exactly as directed by the active `$matspec` skill.
'@
$gitignore = @'
node_modules/
.matspec-cli/report-queue/
'@

New-Item -ItemType Directory -Force -Path (Join-Path $workspace "src"), (Join-Path $workspace "test") | Out-Null
Set-Content -LiteralPath (Join-Path $workspace "package.json") -Value $packageJson -Encoding utf8
Set-Content -LiteralPath (Join-Path $workspace "src/slug.js") -Value $source -Encoding utf8
Set-Content -LiteralPath (Join-Path $workspace "test/slug.test.js") -Value $test -Encoding utf8
Set-Content -LiteralPath (Join-Path $workspace "AGENTS.md") -Value $agents -Encoding utf8
Set-Content -LiteralPath (Join-Path $workspace ".gitignore") -Value $gitignore -Encoding utf8

$cli = Join-Path $sourceRoot "bin/matspec.js"
$shim = "@echo off`r`nnode `"$cli`" %*`r`n"
Set-Content -LiteralPath (Join-Path $harnessBin "matspec.cmd") -Value $shim -Encoding ascii
$env:PATH = "$harnessBin;$env:PATH"
$env:MATSPEC_NO_REPORT = "1"

Push-Location $workspace
try {
    & git init --quiet
    & git config user.name "MatrixSpec Smoke"
    & git config user.email "matspec-smoke@example.invalid"
    & git add --all
    & git commit --quiet -m "fixture: baseline slug behavior"
    if ($LASTEXITCODE -ne 0) { throw "Failed to create the fixture baseline commit." }
} finally {
    Pop-Location
}

function Invoke-MatSpec {
    param(
        [string]$Name,
        [string[]]$Arguments
    )
    $output = & node $cli --path $workspace @Arguments --json --no-update-check 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String).Trim()
    Set-Content -LiteralPath (Join-Path $logs "$Name.json") -Value $text -Encoding utf8
    if ($exitCode -ne 0) { throw "MatSpec $Name failed with exit code ${exitCode}: $text" }
    return $text | ConvertFrom-Json
}

function Invoke-Codex {
    param(
        [string]$Name,
        [string]$Prompt
    )
    $promptFile = Join-Path $logs "$Name.prompt.md"
    $stdoutFile = Join-Path $logs "$Name.session.jsonl"
    $stderrFile = Join-Path $logs "$Name.stderr.log"
    Set-Content -LiteralPath $promptFile -Value $Prompt -Encoding utf8
    Push-Location $workspace
    try {
        Get-Content -Raw -LiteralPath $promptFile |
            & codex exec --model $Model -c "model_reasoning_effort=`"$ReasoningEffort`"" --sandbox danger-full-access --json - 2> $stderrFile |
            Tee-Object -FilePath $stdoutFile | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Codex $Name failed with exit code $LASTEXITCODE. See $stderrFile and $stdoutFile"
        }
    } finally {
        Pop-Location
    }
}

$startedAt = Get-Date
$init = Invoke-MatSpec "01-init" @("init", "--integration", "codex", "--no-template-update")
$started = Invoke-MatSpec "02-start" @("start", "REQ-lean-slug-normalization", "--profile", "lean")
$change = $started.change

$specPath = Join-Path $workspace "matspec/changes/$change/delta-spec.md"
if ($UseFixtureSpec) {
    $fixtureSpec = @'
# REQ-LEAN-SLUG 增量规格

## 目标与范围

规范字符串标签中的空白，同时保持现有公开函数和非字符串兼容行为。

## ADDED Requirements

- 无。

## MODIFIED Requirements

- **REQ-SLUG-001**：字符串必须依次执行首尾空白移除、连续内部空白折叠为一个连字符、全量小写。
  - 验收：`"  Hello   World  "` → `"hello-world"`。
- **REQ-SLUG-002**：仅包含空白的字符串必须返回空字符串。
  - 验收：`" \t\n "` → `""`。

## REMOVED Requirements

- 无。

## 保持不变的行为

- `slugify(value)` 的导出和单参数签名不变；非字符串继续返回空字符串；标点保持原样。

## 输入、默认值、顺序与优先级

- 类型判断优先；字符串按 trim、空白折叠、lowercase 的顺序处理；没有默认参数。

## 失败与回退

- 非字符串返回空字符串且不抛错；无新增副作用、重试或外部依赖。

## 端到端传递

- 调用参数 → `slugify` 类型分流与字符串规范化 → 返回字符串。

## 对外契约

- 公共签名和返回类型不变，只改变字符串空白规范化结果。

## 验收示例

| 场景 | 给定 | 当 | 则 | 覆盖需求 |
|---|---|---|---|---|
| 连续空白 | `"Hello   World"` | 调用函数 | `"hello-world"` | REQ-SLUG-001 |
| 仅空白 | `" \t "` | 调用函数 | `""` | REQ-SLUG-002 |
| 兼容 | `null` | 调用函数 | `""` 且不抛错 | REQ-SLUG-001 |

## 非目标

- 不做标点清洗、字符转写、签名修改、依赖升级或无关重构。

## 决策闭合

- 已确认：上述顺序、兼容和非目标均已闭合。
- 代码事实：当前实现只做小写化并对非字符串返回空字符串。
- 未决问题：无。
'@
    Set-Content -LiteralPath $specPath -Value $fixtureSpec -Encoding utf8
    Set-Content -LiteralPath (Join-Path $logs "03-spec.fixture.md") -Value $fixtureSpec -Encoding utf8
} else {
    $specPrompt = @"
Use `$matspec to execute only the current Lean delta-spec stage for $change.

This is a real, isolated smoke test. Do not browse or use the network. Inspect the small repository and write only the allowed delta-spec artifact. Do not accept the stage and do not modify source or test files.

The product contract is already fully decided, so there are no blocking questions:
- Keep the exported `slugify(value)` signature.
- For string input, trim leading and trailing whitespace, collapse each run of one or more internal whitespace characters to one hyphen, then lowercase the result.
- Whitespace-only input returns the empty string.
- Preserve punctuation exactly; do not transliterate or remove it.
- Preserve the existing non-string fallback: return the empty string without throwing.
- Add observable examples for normal, boundary, and compatibility behavior.
- No new dependencies and no unrelated refactor.

Follow the frozen Lean template and stage contract. Include stable REQ-* IDs, changed and preserved behavior, input/default/order/precedence, failure/fallback, end-to-end propagation, public contract, acceptance examples, non-goals, and closed decisions. Finish after writing delta-spec.md and report its path.
"@
    Invoke-Codex "03-spec" $specPrompt
}

if (-not (Test-Path -LiteralPath $specPath)) { throw "Codex did not create delta-spec.md" }
$specAccept = Invoke-MatSpec "04-accept-spec" @("accept", $change)
if ($specAccept.continuation.nextAction -ne "implement-from-spec") {
    throw "Lean did not hand the confirmed spec directly to implementation."
}

$implementationPrompt = @"
Use `$matspec to execute only the current Lean implementation stage for $change.

This is the fresh implementation session of a real isolated smoke test. Do not browse or use the network. Read the single confirmed delta-spec input once, derive a compact REQ-* checklist, implement it directly, and add focused tests. Do not call `matspec implement`; Lean has no tasks.md. Do not create any proposal, design, tasks, validation, review, or full-spec document. Run `npm test` and report the changed files and exact result. Do not accept or archive the MatSpec change; the smoke-test operator will do that after independently checking the result.
"@
Invoke-Codex "05-implementation" $implementationPrompt

Push-Location $workspace
try {
    $testOutput = & npm test 2>&1
    $testExit = $LASTEXITCODE
    $testText = ($testOutput | Out-String).Trim()
    Set-Content -LiteralPath (Join-Path $logs "06-tests.log") -Value $testText -Encoding utf8
    if ($testExit -ne 0) { throw "Fixture tests failed: $testText" }
    $diff = (& git diff -- . ":(exclude)matspec" ":(exclude).matspec-cli" ":(exclude).agents" ":(exclude).gitignore" ":(exclude)AGENTS.md" | Out-String).Trim()
    Set-Content -LiteralPath (Join-Path $logs "07-product.diff") -Value $diff -Encoding utf8
    if ($diff -notmatch "trim\(\)" -or $diff -notmatch "replace") {
        throw "Product diff does not contain the expected normalization implementation."
    }
} finally {
    Pop-Location
}

$implementationAccept = Invoke-MatSpec "08-accept-implementation" @("accept", $change)
if (-not $implementationAccept.completed) { throw "Lean implementation did not complete the workflow." }
$done = Invoke-MatSpec "09-done" @("done", $change)
if (-not $done.ok) { throw "Lean change was not archived." }

$unexpectedArtifacts = @(@("proposal.md", "delta-design.md", "tasks.md", "validation.md", "review.md") |
    Where-Object { Test-Path -LiteralPath (Join-Path $workspace "$($done.archive)/$_") })
if ($unexpectedArtifacts.Count -gt 0) {
    throw "Lean created unexpected workflow artifacts: $($unexpectedArtifacts -join ', ')"
}

$completedAt = Get-Date
$summary = [ordered]@{
    ok = $true
    model = $Model
    reasoningEffort = $ReasoningEffort
    startedAt = $startedAt.ToString("o")
    completedAt = $completedAt.ToString("o")
    elapsedSeconds = [math]::Round(($completedAt - $startedAt).TotalSeconds, 3)
    runRoot = $runRootPath
    workspace = $workspace
    change = $change
    profile = $started.profile
    specMode = $(if ($UseFixtureSpec) { "fixture" } else { "codex" })
    archive = $done.archive
    stages = @("delta-spec", "implementation")
    sessions = @(
        $(if (-not $UseFixtureSpec) { Join-Path $logs "03-spec.session.jsonl" }),
        (Join-Path $logs "05-implementation.session.jsonl")
    ) | Where-Object { $_ }
    productDiff = Join-Path $logs "07-product.diff"
    tests = Join-Path $logs "06-tests.log"
}
$summaryPath = Join-Path $runRootPath "summary.json"
$summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $summaryPath -Encoding utf8
$summary | ConvertTo-Json -Depth 8
