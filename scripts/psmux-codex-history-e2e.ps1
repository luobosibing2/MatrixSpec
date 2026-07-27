param(
  [string]$Project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$SourceRepository = (Resolve-Path (Join-Path $PSScriptRoot "../../repos/echo")).Path,
  [string]$HistoricalCommit = "dac56bceda4c9e799afc3cee2d4f137c8102db58",
  [string]$Change = "REQ20260527-must-unix-time-docs",
  [string]$Model = "gpt-5.5",
  [string]$ReasoningEffort = "high",
  [ValidateSet("light", "standard", "full")][string]$Profile = "standard",
  [ValidateSet("full", "none")][string]$BaselineMode = "full",
  [string]$Session = "matspec-codex-history-e2e-$PID",
  [string]$ExperimentRoot = "",
  [int]$TimeoutSeconds = 900,
  [string]$ResumeRepository = "",
  [switch]$ResumeFromBlockedValidation,
  [switch]$ResumeFromBlockedReview,
  [switch]$ExerciseRevision,
  [switch]$AllowDangerFullAccess,
  [switch]$KeepArtifacts,
  [switch]$KeepSession
)

$ErrorActionPreference = "Stop"
$repo = if ($ResumeRepository) { (Resolve-Path -LiteralPath $ResumeRepository).Path } else { "" }
$experiment = if ($repo) {
  Split-Path $repo
} elseif ($ExperimentRoot) {
  [IO.Path]::GetFullPath($ExperimentRoot)
} else {
  Join-Path ([IO.Path]::GetTempPath()) "matspec-codex-history-$([guid]::NewGuid().ToString('N'))"
}
if (-not $repo) { $repo = Join-Path $experiment "repo" }
$logs = Join-Path $experiment "logs"
$cli = Join-Path $Project "bin/matspec.js"
$node = (Get-Command node -ErrorAction Stop).Source
$codex = (Get-Command codex -ErrorAction Stop).Source
$codexCmd = (Get-Command codex.cmd -ErrorAction Stop).Source
$candidateCodexHome = $env:CODEX_HOME
$steps = [Collections.Generic.List[object]]::new()
$passed = $false
$hasFullBaseline = $BaselineMode -eq "full"

$requirement = @"
Implement the following Echo documentation correction.
The comments for MustUnixTime, MustUnixTimeMilli, and MustUnixTimeNano incorrectly say they bind to time.Duration even though their destination type is *time.Time. Change those comments to time.Time, remove the stray double spaces, normalize "local Time" to "local time", and change "nano second precision" to "nanosecond precision". Do not change runtime behavior or public signatures.
"@.Trim()

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function Quote-Single {
  param([string]$Value)
  return "'" + ($Value -replace "'", "''") + "'"
}

function Invoke-Native {
  param([string]$Name, [scriptblock]$Command)
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE" }
}

function Invoke-Psmux {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  $isolatedArguments = @("-L", $Session) + $Arguments
  $null = & psmux @isolatedArguments
  if ($LASTEXITCODE -ne 0) {
    throw "psmux $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Stop-PsmuxSession {
  $null = & psmux -L $Session has-session -t $Session 2>$null
  if ($LASTEXITCODE -eq 0) { $null = & psmux -L $Session kill-session -t $Session }
}

function Send-PsmuxCommand {
  param([string]$Command)
  Invoke-Psmux set-buffer $Command
  Invoke-Psmux paste-buffer -t $Session
  Start-Sleep -Milliseconds 200
  Invoke-Psmux send-keys -t $Session Enter
}

function Wait-PsmuxMarker {
  param([string]$Marker)
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  $pattern = [regex]::Escape($Marker) + ":(-?\d+)"
  do {
    $pane = (& psmux -L $Session capture-pane -p -t $Session) -join "`n"
    if ($pane -match $pattern) { return [int]$Matches[1] }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)
  throw "Timed out waiting for $Marker.`n$pane"
}

function Invoke-MatSpec {
  param(
    [string]$Name,
    [string[]]$Arguments,
    [int]$ExpectedExit = 0
  )
  $started = Get-Date
  $marker = "__MATSPEC_HISTORY_$([guid]::NewGuid().ToString('N'))__"
  $output = Join-Path $logs "$Name.json"
  $argumentText = ($Arguments | ForEach-Object { Quote-Single $_ }) -join " "
  $command = "& $(Quote-Single $node) $(Quote-Single $cli) $argumentText --json --no-update-check --no-color *> $(Quote-Single $output); " +
    "`$stepExit = `$LASTEXITCODE; Write-Output `"$marker`:`$stepExit`""
  Send-PsmuxCommand $command
  $exitCode = Wait-PsmuxMarker $marker
  $raw = if (Test-Path -LiteralPath $output) { Get-Content -Raw -LiteralPath $output } else { "" }
  Assert-True ($exitCode -eq $ExpectedExit) "$Name exited $exitCode, expected $ExpectedExit.`n$raw"
  try { $payload = $raw | ConvertFrom-Json } catch { throw "$Name did not return JSON.`n$raw" }
  $steps.Add([ordered]@{
    name = $Name
    kind = "matspec"
    exitCode = $exitCode
    code = $payload.code
    seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)
  }) | Out-Null
  return $payload
}

function Invoke-Codex {
  param(
    [string]$Name,
    [string]$Prompt
  )
  $started = Get-Date
  $promptFile = Join-Path $logs "$Name.prompt.md"
  $eventsFile = Join-Path $logs "$Name.events.jsonl"
  $lastFile = Join-Path $logs "$Name.last.md"
  Set-Content -LiteralPath $promptFile -Value $Prompt -Encoding utf8
  $sandbox = if ($AllowDangerFullAccess) { "danger-full-access" } else { "workspace-write" }
  $args = @(
    "exec", "-C", $repo, "--sandbox", $sandbox, "--ephemeral",
    "--json", "--output-last-message", $lastFile
  )
  if ($Model) { $args += @("--model", $Model) }
  if ($ReasoningEffort) { $args += @("-c", "model_reasoning_effort=`"$ReasoningEffort`"") }
  $argumentText = ($args | ForEach-Object { Quote-Single $_ }) -join " "
  $marker = "__CODEX_HISTORY_$([guid]::NewGuid().ToString('N'))__"
  $command = "Get-Content -Raw -LiteralPath $(Quote-Single $promptFile) | & $(Quote-Single $codex) $argumentText *> $(Quote-Single $eventsFile); " +
    "`$stepExit = `$LASTEXITCODE; Write-Output `"$marker`:`$stepExit`""
  Send-PsmuxCommand $command
  $exitCode = Wait-PsmuxMarker $marker
  $last = if (Test-Path -LiteralPath $lastFile) { (Get-Content -Raw -LiteralPath $lastFile).Trim() } else { "" }
  Assert-True ($exitCode -eq 0) "$Name failed with exit code $exitCode. See $eventsFile"
  Assert-True ($last.Length -gt 0) "$Name did not write a final response. See $eventsFile"
  $usage = $null
  $turns = 0
  $toolCalls = 0
  foreach ($line in Get-Content -LiteralPath $eventsFile) {
    try {
      $event = $line | ConvertFrom-Json
      if ($event.type -eq "turn.completed") {
        $turns += 1
        if ($event.usage) { $usage = $event.usage }
      }
      if ($event.type -eq "item.completed" -and $event.item -and $event.item.type -notin @("agent_message", "reasoning")) { $toolCalls += 1 }
    } catch { }
  }
  $steps.Add([ordered]@{
    name = $Name
    kind = "codex"
    exitCode = $exitCode
    code = $null
    seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)
    inputTokens = if ($usage) { $usage.input_tokens } else { $null }
    cachedInputTokens = if ($usage) { $usage.cached_input_tokens } else { $null }
    outputTokens = if ($usage) { $usage.output_tokens } else { $null }
  }) | Out-Null
  $component = if ($Name -match "validation") { "validation" } elseif ($Name -match "review") { "review" } else { "candidate" }
  $metricArgs = @(
    "--path", $repo, "metrics", "record", "--change", $Change, "--component", $component, "--label", $Name,
    "--turns", [string]$turns, "--tool-calls", [string]$toolCalls,
    "--duration-ms", [string][math]::Round(((Get-Date) - $started).TotalMilliseconds)
  )
  if ($usage) {
    $metricArgs += @(
      "--input-tokens", [string]$usage.input_tokens,
      "--cached-input-tokens", [string]$usage.cached_input_tokens,
      "--output-tokens", [string]$usage.output_tokens
    )
  }
  Invoke-MatSpec "$Name-metrics" $metricArgs | Out-Null
  return $last
}

function New-StagePrompt {
  param([string]$Skill, [string]$Stage)
  $skillReference = '$' + $Skill
  $baselineRule = if ($hasFullBaseline) {
    "The authoritative full baseline exists under matspec/specs. Read it and keep the change artifact consistent with it."
  } else {
    "This is the registered no-full-baseline ablation. matspec/specs/spec.md and matspec/specs/design.md must remain absent until post-review finalization. Proceed from the repository and confirmed change artifacts, record the missing baseline as an accepted treatment limitation or risk, and do not invent baseline facts. The expected absence of those files is not by itself a blocker and must not produce a revise verdict; block only for a concrete unresolved contradiction or ambiguity in the repository, confirmed requirement, or change artifacts."
  }
  $extra = if ($Stage -eq "tasks") {
    @"
Create exactly one parsed implementation task for the binder.go documentation correction and its Go verification. Record the required post-review full-spec/full-design finalization in a separate section that is not another "### Task N".
"@
  } elseif ($Stage -eq "delta-spec") {
    @"
Give every added or modified requirement a stable unique REQ-* ID and use the same ID in its acceptance criteria so done finalization can verify traceability.
"@
  } else { "" }
  return @"
This is a controlled MatSpec historical-requirement end-to-end experiment.

Use $skillReference and generate the current $Stage artifact now. Generation is explicitly authorized. All clarification defaults are approved and there are no open questions.

Confirmed requirement:
$requirement

$baselineRule

Inspect the repository and confirmed MatSpec inputs. Write only the allowed current-stage artifact, do not confirm it, do not advance the workflow, and do not implement the change.
$extra
"@
}

if (-not (Get-Command psmux -ErrorAction SilentlyContinue)) { throw "psmux is required but was not found on PATH." }
Assert-True (Test-Path -LiteralPath $cli) "MatSpec CLI not found: $cli"
Assert-True (Test-Path -LiteralPath (Join-Path $SourceRepository ".git")) "Source repository is not a Git checkout: $SourceRepository"
Assert-True (-not [string]::IsNullOrWhiteSpace($candidateCodexHome)) "CODEX_HOME must be set explicitly for an isolated E2E run."
Assert-True (Test-Path -LiteralPath (Join-Path $candidateCodexHome "auth.json")) "Isolated CODEX_HOME is missing auth.json: $candidateCodexHome"

try {
  New-Item -ItemType Directory -Path $logs -Force | Out-Null
  $oraclePatch = Join-Path $logs "historical-oracle.patch"
  if (-not $ResumeRepository) {
    $sourceBaseCommit = (git -C $SourceRepository rev-parse "$HistoricalCommit^").Trim()
    Assert-True ($sourceBaseCommit -match "^[a-f0-9]{40}$") "Historical parent commit is unavailable in the source repository."
    git -C $SourceRepository diff $sourceBaseCommit $HistoricalCommit -- binder.go | Set-Content -LiteralPath $oraclePatch -Encoding utf8
    $baselineArchive = Join-Path $logs "baseline.tar"
    Invoke-Native "archive historical parent" { git -C $SourceRepository archive --format=tar --output=$baselineArchive $sourceBaseCommit }
    New-Item -ItemType Directory -Path $repo | Out-Null
    Invoke-Native "extract historical parent" { tar -xf $baselineArchive -C $repo }
    Invoke-Native "initialize isolated repository" { git -C $repo init --quiet -b baseline }
    Invoke-Native "disable autocrlf" { git -C $repo config core.autocrlf false }
    Invoke-Native "stage isolated baseline" { git -C $repo add -A }
    $previousAuthorDate = $env:GIT_AUTHOR_DATE
    $previousCommitterDate = $env:GIT_COMMITTER_DATE
    try {
      $env:GIT_AUTHOR_DATE = "2026-07-26T00:00:00Z"
      $env:GIT_COMMITTER_DATE = "2026-07-26T00:00:00Z"
      Invoke-Native "commit isolated baseline" { git -C $repo -c user.name="SDD Experiment" -c user.email="sdd-experiment@invalid.example" -c commit.gpgsign=false commit --quiet -m "Frozen Echo baseline" }
    } finally {
      $env:GIT_AUTHOR_DATE = $previousAuthorDate
      $env:GIT_COMMITTER_DATE = $previousCommitterDate
    }
    $baseCommit = (git -C $repo rev-parse HEAD).Trim()
    Assert-True ((git -C $repo rev-list --count HEAD).Trim() -eq "1") "Candidate repository exposes more than one commit."
    Assert-True (@(git -C $repo remote).Count -eq 0) "Candidate repository unexpectedly has a remote."
  } else {
    $baseCommit = (git -C $repo rev-parse HEAD).Trim()
    $sourceBaseCommit = $null
  }
  Assert-True ((Get-Content -Raw $oraclePatch) -match "MustUnixTime") "Historical commit does not contain the expected binder change."

  $runtimeRoot = Join-Path $repo ".matspec-runtime"
  $runtimeBin = Join-Path $runtimeRoot "node_modules/.bin"
  if (-not (Test-Path -LiteralPath (Join-Path $runtimeBin "matspec.cmd"))) {
    Invoke-Native "install project-local MatSpec runtime" {
      npm install --offline --ignore-scripts --no-audit --no-fund --prefix $runtimeRoot $Project
    }
  }
  Assert-True (Test-Path -LiteralPath (Join-Path $runtimeBin "matspec.cmd")) "Project-local matspec command was not installed."
  $excludePath = (git -C $repo rev-parse --path-format=absolute --git-path info/exclude).Trim()
  if (-not (Test-Path -LiteralPath $excludePath)) { New-Item -ItemType File -Force -Path $excludePath | Out-Null }
  if (@(Get-Content -LiteralPath $excludePath | Where-Object { $_ -eq "/.matspec-runtime/" }).Count -eq 0) {
    "/.matspec-runtime/" | Add-Content -LiteralPath $excludePath -Encoding utf8
  }

  Stop-PsmuxSession
  Invoke-Psmux new -d -s $Session -n codex-history -- pwsh -NoLogo -NoProfile
  Start-Sleep -Milliseconds 500
  $readyMarker = "__MATSPEC_HISTORY_READY_$([guid]::NewGuid().ToString('N'))__"
  Send-PsmuxCommand "[Console]::OutputEncoding = [Text.UTF8Encoding]::new(); `$OutputEncoding = [Text.UTF8Encoding]::new(); `$env:CODEX_HOME = $(Quote-Single $candidateCodexHome); `$env:MATSPEC_NO_REPORT = '1'; `$env:PATH = $(Quote-Single $runtimeBin) + [IO.Path]::PathSeparator + `$env:PATH; Set-Location -LiteralPath $(Quote-Single $repo); Write-Output `"${readyMarker}:0`""
  Assert-True ((Wait-PsmuxMarker $readyMarker) -eq 0) "psmux shell setup failed"
  $paneHomeMarker = "__MATSPEC_HOME_$([guid]::NewGuid().ToString('N'))__"
  $paneHomeOutput = Join-Path $logs "psmux-codex-home.txt"
  Send-PsmuxCommand "Set-Content -LiteralPath $(Quote-Single $paneHomeOutput) -Value `$env:CODEX_HOME -Encoding utf8; Write-Output `"$paneHomeMarker`:0`""
  Assert-True ((Wait-PsmuxMarker $paneHomeMarker) -eq 0) "psmux CODEX_HOME probe failed"
  $paneCodexHome = $null
  for ($attempt = 0; $attempt -lt 20 -and $null -eq $paneCodexHome; $attempt++) {
    try {
      $paneCodexHome = [IO.File]::ReadAllText($paneHomeOutput).Trim()
    } catch [IO.IOException] {
      Start-Sleep -Milliseconds 50
    }
  }
  Assert-True ($null -ne $paneCodexHome) "psmux CODEX_HOME probe remained locked"
  Assert-True ($paneCodexHome -eq $candidateCodexHome) "psmux did not use the isolated CODEX_HOME"
  $policyFile = Join-Path $candidateCodexHome "rules/default.rules"
  if (Test-Path -LiteralPath $policyFile) {
    $policyOutput = Join-Path $logs "execpolicy-preflight.json"
    $policyRaw = & $codexCmd execpolicy check --rules $policyFile -- "C:\Program Files\PowerShell\7\pwsh.exe" "-Command" "matspec go --json"
    Assert-True ($LASTEXITCODE -eq 0) "execpolicy preflight command failed"
    $policyRaw | Set-Content -LiteralPath $policyOutput -Encoding utf8
    $policyResult = $policyRaw | ConvertFrom-Json
    Assert-True ($policyResult.decision -eq "allow") "execpolicy preflight did not allow project-local matspec"
  }

  if (-not $ResumeRepository) {
    $init = Invoke-MatSpec "01-init" @("init", $repo, "--integration", "codex", "--no-template-update")
    Assert-True $init.ok "init failed"

    $generated = $null
    if ($hasFullBaseline) {
      $generated = Invoke-MatSpec "02-generate" @("--path", $repo, "generate", "--runner", "codex", "--mode", "direct", "--model", $Model)
      Assert-True ($generated.status -eq "generated") "Codex generate did not produce a completed run"
      Assert-True ($generated.summary.runner -eq "codex") "generate used $($generated.summary.runner), expected codex"
      $applied = Invoke-MatSpec "03-apply" @("--path", $repo, "apply")
      Assert-True ($applied.applied.Count -eq 2) "apply did not publish both full documents"
    } else {
      $baselineEvidence = [ordered]@{
        mode = $BaselineMode
        generated = $false
        specExists = Test-Path -LiteralPath (Join-Path $repo "matspec/specs/spec.md")
        designExists = Test-Path -LiteralPath (Join-Path $repo "matspec/specs/design.md")
      }
      Assert-True (-not $baselineEvidence.specExists -and -not $baselineEvidence.designExists) "no-baseline treatment started with full documents"
      $baselineEvidence | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logs "02-baseline-treatment.json") -Encoding utf8
    }
    $started = Invoke-MatSpec "04-start" @("--path", $repo, "start", $Change, "--profile", $Profile)
    Assert-True ($started.change -eq $Change) "start returned the wrong change"
    Assert-True ($started.profile -eq $Profile) "start used profile $($started.profile), expected $Profile"

    $stageSkills = [ordered]@{
      "proposal" = "matspec-proposal"
      "delta-spec" = "matspec-delta-spec"
    }
    if ($Profile -eq "full") { $stageSkills["delta-design"] = "matspec-delta-design" }
    $stageSkills["tasks"] = "matspec-tasks"
    if ($Profile -ne "light") { $stageSkills["validation"] = "matspec-validation" }
    $index = 5
    foreach ($entry in $stageSkills.GetEnumerator()) {
      $go = Invoke-MatSpec ("{0:D2}-{1}-go" -f $index++, $entry.Key) @("--path", $repo, "go", $Change)
      Assert-True ($go.stage.key -eq $entry.Key) "go did not enter $($entry.Key)"
      if ($ExerciseRevision -and $entry.Key -eq "validation") {
        Add-Content -LiteralPath (Join-Path $repo "matspec/changes/$Change/delta-spec.md") -Encoding utf8 -Value @"

## Controlled E2E Unresolved Gate

- REV-E2E-001: Whether runtime behavior and public signatures must remain unchanged is unresolved.
"@
        $blockedValidationPrompt = @"
This is a controlled MatSpec revision-routing end-to-end experiment.
Use `$matspec-validation and generate validation.md now. Generation is explicitly authorized.

Inspect all confirmed documents. The `REV-E2E-001` unresolved gate in delta-spec.md is deliberately blocking: validation must not allow implementation. Preserve the YAML front matter, set `matspec.verdict` to `revise`, list `REV-E2E-001` as a concrete blocker, set `repairTarget` to `delta-spec`, and include `delta-spec` in `reviseStages`. Write only validation.md; do not confirm or mutate workflow state.
"@
        Invoke-Codex ("{0:D2}-validation-blocked-codex" -f $index++) $blockedValidationPrompt | Out-Null
        $blocked = Invoke-MatSpec -Name ("{0:D2}-validation-blocked-accept" -f $index++) -Arguments @("--path", $repo, "accept", $Change) -ExpectedExit 1
        Assert-True ($blocked.code -eq "STAGE_VERDICT_BLOCKED") "blocking validation verdict advanced the workflow"
        Assert-True ($blocked.repairTarget -eq "delta-spec") "validation did not route repair to delta-spec"

        $back = Invoke-MatSpec -Name ("{0:D2}-back-delta-spec" -f $index++) -Arguments @("--path", $repo, "back", $Change, "--to", "delta-spec", "--reason", "Resolve REV-E2E-001 before implementation")
        Assert-True ($back.currentStage -eq "delta-spec") "back did not return to delta-spec"
        Assert-True ($back.invalidated -contains "validation") "back did not invalidate validation"
        $repairPrompt = @"
This is the repair step of a controlled MatSpec revision-routing experiment.
Use `$matspec-delta-spec and revise only matspec/changes/$Change/delta-spec.md now. Generation is explicitly authorized.

Resolve and remove the `REV-E2E-001` unresolved gate. Record the confirmed compatibility rule that this change modifies documentation comments only and must not change runtime behavior or public signatures. Make its acceptance criterion decidable. Do not change other files, confirm the stage, or implement.
"@
        Invoke-Codex ("{0:D2}-delta-spec-repair-codex" -f $index++) $repairPrompt | Out-Null
        $reacceptedSpec = Invoke-MatSpec ("{0:D2}-delta-spec-reaccept" -f $index++) @("--path", $repo, "accept", $Change)
        Assert-True ($reacceptedSpec.acceptedStage -eq "delta-spec") "repaired delta-spec was not accepted"
        if ($Profile -eq "full") {
          $reacceptedDesign = Invoke-MatSpec ("{0:D2}-delta-design-reaccept" -f $index++) @("--path", $repo, "accept", $Change)
          Assert-True ($reacceptedDesign.acceptedStage -eq "delta-design") "delta-design was not reaccepted after repair"
        }
        $reacceptedTasks = Invoke-MatSpec ("{0:D2}-tasks-reaccept" -f $index++) @("--path", $repo, "accept", $Change)
        Assert-True ($reacceptedTasks.acceptedStage -eq "tasks") "tasks were not reaccepted after repair"

        Invoke-Codex ("{0:D2}-validation-allow-codex" -f $index++) (New-StagePrompt $entry.Value $entry.Key) | Out-Null
        $acceptedValidation = Invoke-MatSpec ("{0:D2}-validation-allow-accept" -f $index++) @("--path", $repo, "accept", $Change)
        Assert-True ($acceptedValidation.acceptedStage -eq "validation") "revalidated documents were not accepted"
        Assert-True ($acceptedValidation.nextStage.key -eq "implementation") "validation did not reach implementation"
        $state = Get-Content -Raw -LiteralPath (Join-Path $repo "matspec/changes/$Change/.matspec-state.json") | ConvertFrom-Json
        Assert-True ($state.stages.validation.verdict -eq "allow") "structured allow verdict was not stored"
        Assert-True ($null -ne $state.implementationBaseline) "pre-implementation baseline was not captured at validation acceptance"
        continue
      }
      Invoke-Codex ("{0:D2}-{1}-codex" -f $index++, $entry.Key) (New-StagePrompt $entry.Value $entry.Key) | Out-Null
      $ready = Invoke-MatSpec ("{0:D2}-{1}-ready" -f $index++, $entry.Key) @("--path", $repo, "go", $Change)
      $expectedAction = if ($entry.Key -eq "validation") { "delegate-subagent" } else { "await_user_accept" }
      Assert-True ($ready.nextAction -eq $expectedAction) "$($entry.Key) was not ready for acceptance"
      $accepted = Invoke-MatSpec ("{0:D2}-{1}-accept" -f $index++, $entry.Key) @("--path", $repo, "accept", $Change)
      Assert-True ($accepted.acceptedStage -eq $entry.Key) "accepted the wrong stage"
    }

    if (-not $hasFullBaseline) {
      Assert-True (-not (Test-Path -LiteralPath (Join-Path $repo "matspec/specs/spec.md"))) "no-baseline arm created spec.md before implementation"
      Assert-True (-not (Test-Path -LiteralPath (Join-Path $repo "matspec/specs/design.md"))) "no-baseline arm created design.md before implementation"
    }
    $implementation = Invoke-MatSpec ("{0:D2}-implementation-go" -f $index++) @("--path", $repo, "go", $Change)
    Assert-True ($implementation.stage.key -eq "implementation") "implementation stage was not reached"
    $implementationPrompt = @"
This is a controlled MatSpec historical-requirement end-to-end experiment.
Use `$matspec-implement to execute Task 1 now.

Confirmed requirement:
$requirement

Modify only binder.go for the product change. Run the relevant Go tests. Do not refresh matspec/specs/spec.md or matspec/specs/design.md yet, do not enter review, and do not archive. After verification succeeds, mark Task 1 complete through the MatSpec CLI.
"@
    Invoke-Codex ("{0:D2}-implementation-codex" -f $index++) $implementationPrompt | Out-Null
  } else {
    $runId = (Get-ChildItem (Join-Path $repo ".matspec-cli/runs") -Directory | Sort-Object Name | Select-Object -Last 1).Name
    $generated = [pscustomobject]@{ runId = $runId }
    if ($ResumeFromBlockedValidation) {
      $index = 23
      $blocked = Invoke-MatSpec -Name ("{0:D2}-validation-blocked-accept" -f $index++) -Arguments @("--path", $repo, "accept", $Change) -ExpectedExit 1
      Assert-True ($blocked.code -eq "STAGE_VERDICT_BLOCKED") "blocking validation verdict did not block progression"
      Assert-True ($blocked.repairTarget -eq "delta-spec") "validation did not route repair to delta-spec"
      $back = Invoke-MatSpec -Name ("{0:D2}-back-delta-spec" -f $index++) -Arguments @("--path", $repo, "back", $Change, "--to", "delta-spec", "--reason", "Resolve REV-E2E-001 before implementation")
      Assert-True ($back.currentStage -eq "delta-spec") "back did not return to delta-spec"
      $repairPrompt = @"
This is the repair step of a controlled MatSpec revision-routing experiment.
Use `$matspec-delta-spec and revise only matspec/changes/$Change/delta-spec.md now. Generation is explicitly authorized.

Resolve and remove the `REV-E2E-001` unresolved gate. Record the confirmed compatibility rule that this change modifies documentation comments only and must not change runtime behavior or public signatures. Make its acceptance criterion decidable. Do not change other files, confirm the stage, or implement.
"@
      Invoke-Codex ("{0:D2}-delta-spec-repair-codex" -f $index++) $repairPrompt | Out-Null
      $reacceptedSpec = Invoke-MatSpec ("{0:D2}-delta-spec-reaccept" -f $index++) @("--path", $repo, "accept", $Change)
      Assert-True ($reacceptedSpec.acceptedStage -eq "delta-spec") "repaired delta-spec was not accepted"
      $resumeState = Get-Content -Raw -LiteralPath (Join-Path $repo "matspec/changes/$Change/.matspec-state.json") | ConvertFrom-Json
      if (($resumeState.profile -eq "full") -or ($resumeState.workflow.stages.key -contains "delta-design")) {
        $reacceptedDesign = Invoke-MatSpec ("{0:D2}-delta-design-reaccept" -f $index++) @("--path", $repo, "accept", $Change)
        Assert-True ($reacceptedDesign.acceptedStage -eq "delta-design") "delta-design was not reaccepted after repair"
      }
      $reacceptedTasks = Invoke-MatSpec ("{0:D2}-tasks-reaccept" -f $index++) @("--path", $repo, "accept", $Change)
      Assert-True ($reacceptedTasks.acceptedStage -eq "tasks") "tasks were not reaccepted after repair"
      Invoke-Codex ("{0:D2}-validation-allow-codex" -f $index++) (New-StagePrompt "matspec-validation" "validation") | Out-Null
      $acceptedValidation = Invoke-MatSpec ("{0:D2}-validation-allow-accept" -f $index++) @("--path", $repo, "accept", $Change)
      Assert-True ($acceptedValidation.acceptedStage -eq "validation") "revalidated documents were not accepted"
      $state = Get-Content -Raw -LiteralPath (Join-Path $repo "matspec/changes/$Change/.matspec-state.json") | ConvertFrom-Json
      Assert-True ($state.stages.validation.verdict -eq "allow") "structured allow verdict was not stored"
      Assert-True ($null -ne $state.implementationBaseline) "pre-implementation baseline was not captured"
      $implementationPrompt = @"
This is a controlled MatSpec historical-requirement end-to-end experiment.
Use `$matspec-implement to execute Task 1 now.

Confirmed requirement:
$requirement

Modify only binder.go for the product change. Run the relevant Go tests. Do not refresh matspec/specs/spec.md or matspec/specs/design.md yet, do not enter review, and do not archive. After verification succeeds, mark Task 1 complete through the MatSpec CLI.
"@
      Invoke-Codex ("{0:D2}-implementation-codex" -f $index++) $implementationPrompt | Out-Null
    } elseif ($ResumeFromBlockedReview) {
      $index = 38
      $back = Invoke-MatSpec -Name ("{0:D2}-review-back-implementation" -f $index++) -Arguments @("--path", $repo, "back", $Change, "--to", "implementation", "--reason", "Rerun the required Go suite without host proxy interference")
      Assert-True ($back.currentStage -eq "implementation") "review repair did not route back to implementation"
      $state = Get-Content -Raw -LiteralPath (Join-Path $repo "matspec/changes/$Change/.matspec-state.json") | ConvertFrom-Json
      Assert-True ($null -ne $state.implementationBaseline) "review repair incorrectly discarded the pre-implementation baseline"
      $repairPrompt = @"
This is the implementation repair requested by a real MatSpec review.
Use `$matspec-implement. Do not modify source code because binder.go already matches the confirmed historical patch.

The review observed HTTP 502 failures caused by inherited host proxy variables. Clear HTTP_PROXY, HTTPS_PROXY, ALL_PROXY and their lowercase variants; set NO_PROXY/no_proxy for localhost,127.0.0.1,::1; then run `go test -short ./...` and `git diff --check`. Preserve the successful evidence and do not enter review, update full docs, or archive.
"@
      Invoke-Codex ("{0:D2}-implementation-repair-codex" -f $index++) $repairPrompt | Out-Null
    } else {
      $index = 27
    }
  }

  $binder = Get-Content -Raw -LiteralPath (Join-Path $repo "binder.go")
  Assert-True ($binder -match "MustUnixTime requires parameter value to exist to bind to time\.Time variable") "MustUnixTime documentation was not corrected"
  Assert-True ($binder -match "MustUnixTimeMilli requires parameter value to exist to bind to time\.Time variable") "MustUnixTimeMilli documentation was not corrected"
  Assert-True ($binder -match "MustUnixTimeNano requires parameter value to exist to bind to time\.Time variable") "MustUnixTimeNano documentation was not corrected"
  Assert-True ($binder -notmatch "MustUnixTime(?:Milli|Nano)? requires parameter value to exist to bind to time\.Duration") "A MustUnixTime comment still names time.Duration"
  Assert-True ($binder -match "nanosecond precision") "MustUnixTimeNano documentation still uses the old precision wording"
  Invoke-Native "Go tests" { git -C $repo diff --check }
  Invoke-Native "Go tests" {
    $env:NO_PROXY = "localhost,127.0.0.1,::1,$env:NO_PROXY"
    $env:no_proxy = $env:NO_PROXY
    $env:HTTP_PROXY = ""
    $env:HTTPS_PROXY = ""
    $env:ALL_PROXY = ""
    $env:http_proxy = ""
    $env:https_proxy = ""
    $env:all_proxy = ""
    go -C $repo test ./...
  }

  $implementationStatus = Invoke-MatSpec ("{0:D2}-implementation-status" -f $index++) @("--path", $repo, "implement", $Change, "--run")
  Assert-True (
    $implementationStatus.tasks.pending -eq 0 -and
    $implementationStatus.tasks.in_progress -eq 0 -and
    $implementationStatus.tasks.blocked -eq 0 -and
    $implementationStatus.tasks.done -gt 0
  ) "not all implementation tasks are complete"
  $implementationAccepted = Invoke-MatSpec ("{0:D2}-implementation-accept" -f $index++) @("--path", $repo, "accept", $Change)
  Assert-True ($implementationAccepted.acceptedStage -eq "implementation") "implementation was not accepted"

  $reviewEntered = Invoke-MatSpec ("{0:D2}-review-enter" -f $index++) @("--path", $repo, "review", $Change)
  Assert-True ($reviewEntered.stage.key -eq "review") "review stage was not entered"
  $reviewEvidence = if ($Profile -eq "light") { "the confirmed proposal, delta, tasks, and test evidence" } else { "the confirmed proposal, deltas, tasks, validation, and test evidence" }
  $reviewPrompt = @"
This is a controlled MatSpec historical-requirement end-to-end experiment.
Use `$matspec-review to review the completed implementation now. Compare binder.go with $reviewEvidence. If you rerun Go tests, clear HTTP_PROXY, HTTPS_PROXY, ALL_PROXY and lowercase variants, and set NO_PROXY/no_proxy for localhost,127.0.0.1,::1 so host proxy settings do not turn local ephemeral listeners into HTTP 502 failures. Write only the allowed review.md artifact. Do not confirm, finalize full documents, or archive.
"@
  Invoke-Codex ("{0:D2}-review-codex" -f $index++) $reviewPrompt | Out-Null
  $reviewReady = Invoke-MatSpec ("{0:D2}-review-ready" -f $index++) @("--path", $repo, "go", $Change)
  Assert-True ($reviewReady.nextAction -eq "delegate-subagent") "review was not ready for acceptance"
  $reviewAccepted = Invoke-MatSpec ("{0:D2}-review-accept" -f $index++) @("--path", $repo, "accept", $Change)
  Assert-True ($reviewAccepted.acceptedStage -eq "review") "review was not accepted"

  $blockedDone = Invoke-MatSpec -Name ("{0:D2}-done-before-finalization" -f $index++) -Arguments @("--path", $repo, "done", $Change) -ExpectedExit 1
  $expectedDoneBlock = "FULL_DOCS_NOT_UPDATED"
  Assert-True ($blockedDone.code -eq $expectedDoneBlock) "done did not enforce post-review full-document finalization for baseline mode $BaselineMode"
  $finalizationAction = if ($hasFullBaseline) {
    "Update only matspec/specs/spec.md and matspec/specs/design.md so the existing authoritative documents include this accepted documentation correction and its design impact."
  } else {
    "Create matspec/specs/spec.md and matspec/specs/design.md for the first time from repository facts and the accepted change artifacts. Keep them narrowly authoritative, and do not claim that a pre-implementation baseline existed."
  }
  $finalizationPrompt = @"
This is the done-finalization step for the accepted MatSpec change $Change.
Read the confirmed delta-spec.md, tasks.md, review.md, optional delta-design.md if present, the repository, and the actual binder.go change. $finalizationAction Preserve every REQ-* ID from delta-spec.md in the full spec. Do not modify source files, confirm stages, or call matspec done.
"@
  Invoke-Codex ("{0:D2}-finalization-codex" -f $index++) $finalizationPrompt | Out-Null
  Assert-True (Test-Path -LiteralPath (Join-Path $repo "matspec/specs/spec.md")) "finalization did not produce spec.md"
  Assert-True (Test-Path -LiteralPath (Join-Path $repo "matspec/specs/design.md")) "finalization did not produce design.md"
  $done = Invoke-MatSpec ("{0:D2}-done" -f $index++) @("--path", $repo, "done", $Change)
  Assert-True ($done.archive -match "matspec/changes/archives/\d{4}-\d{2}-\d{2}-$Change") "done did not archive the change"

  $status = git -C $repo status --short
  $sourceDiff = git -C $repo diff -- binder.go
  $usageRows = @()
  $codexSeconds = 0.0
  Get-ChildItem -LiteralPath $logs -Filter "*.events.jsonl" | ForEach-Object {
    $usage = $null
    foreach ($line in Get-Content -LiteralPath $_.FullName) {
      try {
        $event = $line | ConvertFrom-Json -ErrorAction Stop
        if ($event.type -eq "turn.completed" -and $event.usage) { $usage = $event.usage }
      } catch { }
    }
    if ($usage) { $usageRows += $usage }
    $prompt = Join-Path $logs ($_.Name -replace "\.events\.jsonl$", ".prompt.md")
    if (Test-Path -LiteralPath $prompt) { $codexSeconds += ($_.LastWriteTime - (Get-Item -LiteralPath $prompt).LastWriteTime).TotalSeconds }
  }
  $generationLog = if ($generated) { Join-Path $repo ".matspec-cli/runs/$($generated.runId)/logs/external.json" } else { $null }
  $generationUsage = if ($generationLog -and (Test-Path -LiteralPath $generationLog)) { (Get-Content -Raw -LiteralPath $generationLog | ConvertFrom-Json).tokens } else { $null }
  $generateStep = Join-Path $logs "02-generate.json"
  if (Test-Path -LiteralPath $generateStep) {
    $generateFile = Get-Item -LiteralPath $generateStep
    $codexSeconds += ($generateFile.LastWriteTime - $generateFile.CreationTime).TotalSeconds
  }
  if ($generationUsage) {
    $generationSeconds = ($steps | Where-Object name -eq "02-generate" | Select-Object -First 1).seconds
    Invoke-MatSpec "metrics-generation" @(
      "--path", $repo, "metrics", "record", "--change", $Change, "--component", "candidate", "--label", "baseline-generation",
      "--turns", "2", "--tool-calls", "0", "--input-tokens", [string]$generationUsage.input,
      "--cached-input-tokens", "0", "--output-tokens", [string]$generationUsage.output,
      "--duration-ms", [string][math]::Round(([double]$generationSeconds) * 1000)
    ) | Out-Null
  }
  $workflowMetrics = Invoke-MatSpec "metrics-summary" @("--path", $repo, "metrics", "show")
  $passed = $true
  [ordered]@{
    ok = $true
    session = $Session
    workspace = if ($KeepArtifacts) { $repo } else { $null }
    logs = if ($KeepArtifacts) { $logs } else { $null }
    artifactsRetained = [bool]$KeepArtifacts
    sourceRepository = $SourceRepository
    historicalCommit = $HistoricalCommit
    sourceBaseCommit = $sourceBaseCommit
    baseCommit = $baseCommit
    change = $Change
    model = $Model
    reasoningEffort = $ReasoningEffort
    profile = $Profile
    baselineMode = $BaselineMode
    exercisedRevision = [bool]$ExerciseRevision
    codexSandbox = if ($AllowDangerFullAccess) { "danger-full-access" } else { "workspace-write" }
    runId = if ($generated) { $generated.runId } else { $null }
    archive = $done.archive
    sourceDiffMatchesOracle = (
      (($sourceDiff -join "`n") -replace "`r`n", "`n").Trim() -eq
      ((Get-Content -Raw $oraclePatch) -replace "`r`n", "`n").Trim()
    )
    gitStatus = $status
    usage = [ordered]@{
      codexCalls = $usageRows.Count + $(if ($generationUsage) { 2 } else { 0 })
      inputTokens = ($usageRows | Measure-Object -Property input_tokens -Sum).Sum + $(if ($generationUsage) { $generationUsage.input } else { 0 })
      cachedInputTokens = ($usageRows | Measure-Object -Property cached_input_tokens -Sum).Sum
      outputTokens = ($usageRows | Measure-Object -Property output_tokens -Sum).Sum + $(if ($generationUsage) { $generationUsage.output } else { 0 })
      reasoningOutputTokens = ($usageRows | Measure-Object -Property reasoning_output_tokens -Sum).Sum
      codexSeconds = [math]::Round($codexSeconds, 1)
      note = if ($generationUsage) { "Cached-input split is unavailable for the two generate calls." } else { "No baseline-generation calls were made." }
    }
    workflowMetrics = $workflowMetrics
    steps = $steps
  } | ConvertTo-Json -Depth 6
} finally {
  if (-not $KeepSession) { Stop-PsmuxSession }
  if ($passed -and -not $KeepArtifacts) {
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    $fullExperiment = [IO.Path]::GetFullPath($experiment)
    Assert-True ($fullExperiment.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) "Refusing to remove non-temp path: $fullExperiment"
    Remove-Item -LiteralPath $fullExperiment -Recurse -Force
  } elseif (-not $passed) {
    Write-Warning "Codex history E2E artifacts retained for diagnosis: $experiment"
  }
}
