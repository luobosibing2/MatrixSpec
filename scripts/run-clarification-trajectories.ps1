param(
  [string]$RunRoot = "",
  [string]$SourceRepo = "",
  [string]$MatSpecRoot = "",
  [ValidateSet("low", "medium", "high", "xhigh")]
  [string]$ReasoningEffort = "low",
  [int]$MaxTurns = 8
)

$ErrorActionPreference = "Stop"

if (-not $MatSpecRoot) {
  $MatSpecRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
}
if (-not $SourceRepo) {
  $SourceRepo = (Resolve-Path -LiteralPath (Join-Path $MatSpecRoot "..\repos\spring-petclinic")).Path
}
if (-not $RunRoot) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $RunRoot = Join-Path $MatSpecRoot "runs\clarification-$stamp"
}

$CaseName = "case-owner-phone-lookup"
$ChangeName = "REQ20260507-owner-phone-lookup"
$MatSpecBin = Join-Path $MatSpecRoot "bin\matspec.js"
$SuperpowersCache = Join-Path $env:USERPROFILE ".codex\superpowers-cache"

function New-Dir([string]$Path) {
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Copy-Project([string]$Destination) {
  if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }
  New-Dir $Destination
  $args = @(
    $SourceRepo,
    $Destination,
    "/MIR",
    "/XD", ".git", ".codegraph", ".symbol", ".opencode", ".github", ".devcontainer", "target", "build", ".gradle",
    "/XF", "*.class",
    "/NFL", "/NDL", "/NJH", "/NJS", "/NP"
  )
  & robocopy @args | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "robocopy failed with exit code $LASTEXITCODE"
  }
  & git -C $Destination init | Out-Null
  & git -C $Destination config user.email "matspec-experiment@example.local" | Out-Null
  & git -C $Destination config user.name "MatSpec Experiment" | Out-Null
  & git -C $Destination add . | Out-Null
  & git -C $Destination commit -m "baseline" | Out-Null
}

function Ensure-SuperpowersCache {
  if (-not (Test-Path -LiteralPath $SuperpowersCache)) {
    git clone --depth 1 https://github.com/obra/superpowers.git $SuperpowersCache
  }
}

function Invoke-MatSpec([string[]]$CliArgs) {
  $result = & node $MatSpecBin @CliArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "matspec failed: $($result -join "`n")"
  }
  return $result
}

function Add-OptimizedMatSpecRules([string]$Repo) {
  $block = @'

## Experiment: Optimized Proposal Discovery Rules

For this experiment, the proposal stage is a real-need discovery gate, not a change request form.

Always obey the base MatSpec state machine: first call `matspec go --json`, write only to `stage.allowedWritePath`, never create a root-level `proposal.md`, and never call `matspec accept --json` before the user explicitly confirms the written artifact.

When the user's request names a surface solution such as "add a field", "add a button", "support search", "optimize", "improve", or "make faster", ask what operational problem or workflow failure the solution is meant to solve before generation approval.

`proposal.md` must include these sections:

```text
## 0. User Clarification Log
## 1. Requested Change vs Real Need
## 2. Problem Statement
## 3. User, Actor, and Scenario
## 4. Success Criteria
## 5. Scope Boundary
## 6. Non-Goals
## 7. Confirmed Decisions
## 8. Assumptions and Open Questions
## 9. Impact Preview
```

Before writing `proposal.md`, explicitly separate:

- user-confirmed decisions
- code or baseline facts
- agent-inferred/proposed decisions
- open questions that would affect the next stage

Do not treat a UI request as the real requirement until the user confirms the workflow problem, affected actor, success signal, in-scope behavior, and non-goals. Do not include implementation choices in `proposal.md`.
'@

  foreach ($relative in @(
      ".agents\skills\matspec\SKILL.md",
      ".agents\skills\matspec-proposal\SKILL.md"
    )) {
    $file = Join-Path $Repo $relative
    if (Test-Path -LiteralPath $file) {
      Add-Content -LiteralPath $file -Value $block -Encoding UTF8
    }
  }
}

function Setup-Variant([string]$Variant, [string]$VariantDir) {
  $repo = Join-Path $VariantDir "repo"
  Copy-Project $repo

  if ($Variant -in @("with-baseline", "with-optimized")) {
    Invoke-MatSpec -CliArgs @("init", $repo, "--integration", "codex", "--json") | Out-Null
    Invoke-MatSpec -CliArgs @("--path", $repo, "start", $ChangeName, "--json") | Out-Null
    if (-not (Test-Path -LiteralPath (Join-Path $repo ".agents\skills\matspec\SKILL.md"))) {
      throw "MatSpec Codex skill was not installed in $repo"
    }
    if ($Variant -eq "with-optimized") {
      Add-OptimizedMatSpecRules $repo
    }
  }

  if ($Variant -eq "with-superpowers") {
    Ensure-SuperpowersCache
    New-Dir (Join-Path $repo ".agents\skills")
    $link = Join-Path $repo ".agents\skills\superpowers"
    if (Test-Path -LiteralPath $link) {
      Remove-Item -LiteralPath $link -Recurse -Force
    }
    cmd /c mklink /J "$link" "$(Join-Path $SuperpowersCache "skills")" | Out-Null
  }

  return $repo
}

function Get-InitialPrompt([string]$Variant) {
  $headings = @(
    "Requested Change",
    "Real Need",
    "Actors and Scenario",
    "Success Criteria",
    "Scope",
    "Non-Goals",
    "Confirmed Decisions",
    "Assumptions and Open Questions"
  ) -join "`n"

  if ($Variant -eq "without") {
    return @(
      "This is a controlled requirement-clarification experiment.",
      "",
      "Do not use MatSpec. Do not use Superpowers. Do not implement code.",
      "Inspect the existing Spring PetClinic code only as needed to understand current behavior.",
      "",
      'Clarify the requirement through dialogue first. When you believe there are no blocking clarification questions, ask me to reply exactly "generate". Do not write files before I reply "generate".',
      "",
      "After I reply `"generate`", write requirement-summary.md in the repository root using exactly these headings:",
      "",
      $headings,
      "",
      "Initial request:",
      "在 Find Owners 页面加一个电话号码搜索框。"
    ) -join "`n"
  }

  if ($Variant -eq "with-superpowers") {
    return @(
      "Use Superpowers, especially superpowers:brainstorming, for requirement discovery.",
      "",
      "This is a controlled requirement-clarification experiment.",
      "Do not use MatSpec. Do not implement code. User instructions override the default Superpowers spec location for this experiment.",
      "",
      'Clarify the requirement through dialogue first. When ready, ask me to reply exactly "generate". Do not write files before I reply "generate".',
      "",
      "After I reply `"generate`", write requirement-summary.md in the repository root using exactly these headings:",
      "",
      $headings,
      "",
      "Initial request:",
      "在 Find Owners 页面加一个电话号码搜索框。"
    ) -join "`n"
  }

  return @(
    "Use the MatSpec repository skill to run the active MatSpec proposal stage.",
    "",
    "This is a controlled requirement-clarification experiment.",
    "Do not implement code.",
    "Do not write proposal.md until you ask for generation approval and I reply exactly generate.",
    "After writing proposal.md, do not call matspec accept --json until I reply exactly confirm.",
    "Stop immediately after proposal.md is confirmed; do not continue into implementation.",
    "",
    "Initial request:",
    "在 Find Owners 页面加一个电话号码搜索框。"
  ) -join "`n"
}

function Invoke-CodexTurn(
  [string]$VariantDir,
  [string]$Repo,
  [string]$Prompt,
  [string]$SessionId,
  [int]$Turn
) {
  $turnDir = Join-Path $VariantDir ("turn-{0:D2}" -f $Turn)
  New-Dir $turnDir
  $promptFile = Join-Path $turnDir "prompt.txt"
  $jsonlFile = Join-Path $turnDir "events.jsonl"
  $lastFile = Join-Path $turnDir "last-message.txt"
  Set-Content -LiteralPath $promptFile -Value $Prompt -Encoding UTF8

  if ($SessionId) {
    $output = Get-Content -Raw -LiteralPath $promptFile |
      & codex exec resume $SessionId --json -o $lastFile -c model_reasoning_effort="`"$ReasoningEffort`"" - 2>&1
  }
  else {
    $output = Get-Content -Raw -LiteralPath $promptFile |
      & codex exec --cd $Repo --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox --json -o $lastFile -c model_reasoning_effort="`"$ReasoningEffort`"" - 2>&1
  }

  $output | Set-Content -LiteralPath $jsonlFile -Encoding UTF8
  $raw = ($output -join "`n")
  if (-not $SessionId -and $raw -match '"thread_id":"([^"]+)"') {
    $SessionId = $Matches[1]
    Set-Content -LiteralPath (Join-Path $VariantDir "thread-id.txt") -Value $SessionId -Encoding UTF8
  }

  $last = ""
  if (Test-Path -LiteralPath $lastFile) {
    $last = Get-Content -Raw -LiteralPath $lastFile
  }

  return [PSCustomObject]@{
    SessionId = $SessionId
    LastMessage = $last
    TurnDir = $turnDir
  }
}

function Get-StageStatus([string]$Repo) {
  try {
    $text = & node $MatSpecBin "--path" $Repo "status" "--json" 2>$null
    if ($LASTEXITCODE -eq 0) {
      return $text | ConvertFrom-Json
    }
  }
  catch {
    return $null
  }
  return $null
}

function Is-Complete([string]$Variant, [string]$Repo) {
  if ($Variant -in @("with-baseline", "with-optimized")) {
    $status = Get-StageStatus $Repo
    if ($status -and $status.stages) {
      $proposal = $status.stages | Where-Object { $_.key -eq "proposal" } | Select-Object -First 1
      if ($proposal -and $proposal.status -eq "confirmed") {
        return $true
      }
    }
    return $false
  }
  return (Test-Path -LiteralPath (Join-Path $Repo "requirement-summary.md"))
}

function Get-NextUserReply([string]$Variant, [string]$Repo, [string]$Message) {
  $text = $Message.ToLowerInvariant()
  $proposalFile = Get-ChildItem -Path (Join-Path $Repo "matspec\changes") -Recurse -Filter "proposal.md" -ErrorAction SilentlyContinue | Select-Object -First 1
  $asksQuestion = ($text -match '\?' -or $text -match '？' -or $text -match 'q\d|question|问题|请选择|which|should|是否|如何')

  if ($text -match 'visual companion|web browser|mockups, diagrams|想.*浏览器|可视') {
    return "不用浏览器，文字澄清即可。请继续需求澄清。"
  }

  if (-not $asksQuestion -and $text -match 'reply.*generate|reply exactly "generate"|回复.*generate|ready to generate|请回复.*generate|`generate`') {
    return "generate"
  }

  if ($Variant -in @("with-baseline", "with-optimized") -and $proposalFile -and
      -not $asksQuestion -and $text -match 'confirm|next|review|确认|matches your intent|accept this stage|请确认') {
    return "confirm"
  }

  $answers = New-Object System.Collections.Generic.List[string]

  if ($text -match 'why|purpose|real need|problem|pain|workflow|业务|目的|为什么|痛点|真实|场景') {
    $answers.Add("真实需求是前台接电话时客户经常只报电话号码，或者姓氏拼写不清。前台需要通过电话号码快速定位 owner，减少误找和重复建档。")
  }
  if ($text -match 'actor|user|role|who|front desk|clerk|用户|角色|谁|前台') {
    $answers.Add("主要使用者是诊所前台工作人员，他们在接电话或现场登记时查找已有 owner。")
  }
  if ($text -match 'phone|telephone|format|match|exact|normalize|hyphen|10|电话号码|电话|格式|匹配|精确|归一') {
    $answers.Add("电话号码按现有 owner.telephone 的 10 位数字做精确匹配；不需要支持空格、连字符、国际号码或格式归一化。")
  }
  if ($text -match 'scope|boundary|non-goal|out of scope|范围|边界|非目标|不做|排除') {
    $answers.Add("范围只包含 Find Owners 页面上的 owner 电话查找。不做全局搜索、模糊搜索、搜索历史、权限、审计，也不改 owner 创建或编辑表单的电话校验规则。")
  }
  if ($text -match 'last name|lastname|existing|current behavior|baseline|preserve|保留|现有|姓氏') {
    $answers.Add("现有 last name 搜索行为必须保留：无参数查全部，last name 前缀搜索，单结果跳转 owner 详情，多结果显示列表，无结果返回查找页并显示 not found。")
  }
  if ($text -match 'both|simultaneous|together|priority|同时|优先|两个.*输入|last.*telephone|telephone.*last') {
    $answers.Add("如果 last name 和 telephone 同时输入，telephone 优先，因为接电话场景下电话号码用于快速定位唯一 owner。")
  }
  if ($text -match 'success|acceptance|done|验收|成功|完成|criteria') {
    $answers.Add("验收标准：输入 6085551023 能找到 George Franklin 并跳转 /owners/1；输入不存在的 10 位电话返回 Find Owners 并显示 not found；last name 搜索和无参数查询的现有行为不回退。")
  }

  if ($answers.Count -gt 0) {
    return ($answers -join "`n`n")
  }

  if ($asksQuestion) {
    return "我还没有补充更多需求。请基于现有 PetClinic 行为继续澄清最会影响范围或验收的问题。"
  }

  return "请继续。如果你已经没有会影响范围或验收的问题，请请求我回复 generate。"
}

function Collect-Artifacts([string]$Variant, [string]$Repo, [string]$VariantDir) {
  $artifactDir = Join-Path $VariantDir "artifacts"
  New-Dir $artifactDir

  if ($Variant -in @("with-baseline", "with-optimized")) {
    $changeDir = Get-ChildItem -Path (Join-Path $Repo "matspec\changes") -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -ne "archives" } |
      Select-Object -First 1
    if ($changeDir) {
      Copy-Item -LiteralPath $changeDir.FullName -Destination (Join-Path $artifactDir "matspec-change") -Recurse -Force
    }
    $status = Get-StageStatus $Repo
    if ($status) {
      $status | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $artifactDir "matspec-status.json") -Encoding UTF8
    }
  }
  else {
    $summary = Join-Path $Repo "requirement-summary.md"
    if (Test-Path -LiteralPath $summary) {
      Copy-Item -LiteralPath $summary -Destination (Join-Path $artifactDir "requirement-summary.md") -Force
    }
  }
}

function Run-Variant([string]$Variant) {
  $variantDir = Join-Path (Join-Path $RunRoot $CaseName) $Variant
  New-Dir $variantDir
  $repo = Setup-Variant $Variant $variantDir
  Set-Content -LiteralPath (Join-Path $variantDir "repo-path.txt") -Value $repo -Encoding UTF8

  $sessionId = ""
  $prompt = Get-InitialPrompt $Variant
  for ($turn = 1; $turn -le $MaxTurns; $turn++) {
    $result = Invoke-CodexTurn $variantDir $repo $prompt $sessionId $turn
    $sessionId = $result.SessionId

    if (Is-Complete $Variant $repo) {
      Collect-Artifacts $Variant $repo $variantDir
      return [PSCustomObject]@{ Variant = $Variant; Complete = $true; Turns = $turn; Repo = $repo }
    }

    $prompt = Get-NextUserReply $Variant $repo $result.LastMessage
    Set-Content -LiteralPath (Join-Path $result.TurnDir "simulated-user-reply.txt") -Value $prompt -Encoding UTF8
  }

  Collect-Artifacts $Variant $repo $variantDir
  return [PSCustomObject]@{ Variant = $Variant; Complete = $false; Turns = $MaxTurns; Repo = $repo }
}

New-Dir $RunRoot

$oracle = @'
# Oracle: case-owner-phone-lookup

Initial request:
在 Find Owners 页面加一个电话号码搜索框。

Hidden real need:
前台接电话时客户经常只报电话号码，或者姓氏拼写不清。前台需要通过电话号码快速定位 owner，减少误找和重复建档。

In scope:
- Find Owners 页面支持 owner telephone 查找。
- 电话号码按现有 10 位数字精确匹配。
- 同时输入 last name 和 telephone 时，telephone 优先。
- 保留现有 last name 搜索行为。

Out of scope:
- 国际号码、连字符、空格、格式归一化。
- 模糊电话搜索、全局搜索、搜索历史。
- 权限、审计。
- owner 创建/编辑表单电话校验规则变更。

Baseline behavior to preserve:
- 无参数 /owners 返回所有 owners 列表。
- last name 前缀搜索。
- 单个 owner 结果跳转详情页。
- 多个结果显示 ownersList。
- 无结果返回 findOwners 并显示 not found。

Acceptance:
- telephone=6085551023 finds George Franklin and redirects to /owners/1.
- nonexistent 10-digit telephone returns findOwners with not found.
- lastName=Franklin behavior remains unchanged.
- parameterless /owners behavior remains unchanged.
'@
New-Dir (Join-Path $RunRoot $CaseName)
Set-Content -LiteralPath (Join-Path $RunRoot $CaseName "oracle.md") -Value $oracle -Encoding UTF8

$results = @()
foreach ($variant in @("without", "with-baseline", "with-optimized", "with-superpowers")) {
  $results += Run-Variant $variant
}

$results | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $RunRoot $CaseName "run-results.json") -Encoding UTF8
$results | Format-Table -AutoSize
"RUN_ROOT=$RunRoot"
