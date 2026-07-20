param(
  [string]$Project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$Session = "matspec-workflow-e2e-$PID",
  [int]$TimeoutSeconds = 15,
  [switch]$KeepArtifacts,
  [switch]$KeepSession
)

$ErrorActionPreference = "Stop"
$change = "REQ20260720-psmux-workflow"
$work = Join-Path ([IO.Path]::GetTempPath()) "matspec-psmux-workflow-$([guid]::NewGuid().ToString('N'))"
$cli = Join-Path $Project "bin/matspec.js"
$node = (Get-Command node -ErrorAction Stop).Source
$steps = [Collections.Generic.List[object]]::new()
$passed = $false

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function Quote-Single {
  param([string]$Value)
  return "'" + ($Value -replace "'", "''") + "'"
}

function Invoke-Psmux {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  $null = & psmux @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "psmux $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Stop-PsmuxSession {
  $null = & psmux has-session -t $Session 2>$null
  if ($LASTEXITCODE -eq 0) { $null = & psmux kill-session -t $Session }
}

function Send-PsmuxCommand {
  param([string]$Command)
  Invoke-Psmux send-keys -t $Session -l $Command
  Invoke-Psmux send-keys -t $Session Enter
}

function Wait-PsmuxMarker {
  param([string]$Marker)
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  $pattern = [regex]::Escape($Marker) + ":(-?\d+)"
  do {
    $pane = (& psmux capture-pane -p -t $Session) -join "`n"
    if ($pane -match $pattern) { return [int]$Matches[1] }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $deadline)
  throw "Timed out waiting for $Marker.`n$pane"
}

function Invoke-MatSpec {
  param(
    [string]$Name,
    [string[]]$Arguments,
    [int]$ExpectedExit = 0
  )

  $marker = "__MATSPEC_E2E_$([guid]::NewGuid().ToString('N'))__"
  $output = Join-Path $work "$Name.json"
  $argumentText = ($Arguments | ForEach-Object { Quote-Single $_ }) -join " "
  $command = "& $(Quote-Single $node) $(Quote-Single $cli) $argumentText --json --no-update-check --no-color *> $(Quote-Single $output); " +
    "`$e2eExit = `$LASTEXITCODE; Write-Output `"$marker`:`$e2eExit`""
  Send-PsmuxCommand $command
  $exitCode = Wait-PsmuxMarker $marker
  $raw = if (Test-Path -LiteralPath $output) { Get-Content -Raw -LiteralPath $output } else { "" }
  Assert-True ($exitCode -eq $ExpectedExit) "$Name exited $exitCode, expected $ExpectedExit.`n$raw"
  try {
    $payload = $raw | ConvertFrom-Json
  } catch {
    throw "$Name did not return JSON.`n$raw"
  }
  $steps.Add([ordered]@{ name = $Name; exitCode = $exitCode; code = $payload.code }) | Out-Null
  return $payload
}

function Write-Stage {
  param([string]$File, [string]$Content)
  Set-Content -LiteralPath (Join-Path $work "matspec/changes/$change/$File") -Value $Content -Encoding utf8
}

if (-not (Get-Command psmux -ErrorAction SilentlyContinue)) {
  throw "psmux is required but was not found on PATH."
}
Assert-True (Test-Path -LiteralPath $cli) "MatSpec CLI not found: $cli"

$stageFiles = [ordered]@{
  "proposal" = @{
    file = "proposal.md"
    content = @"
# Proposal
## 0. User Clarification Log
### 0.1 Confirmed Decisions
- Use the default E2E behavior.
### 0.2 Open Questions
- None.
### 0.3 Decision Ledger
| Decision | Source | Status | Impact |
|---|---|---|---|
| Default clarification | user | confirmed | scope |
## 1. Requested Change vs Real Need
Exercise every workflow stage.
## 5. Scope Boundary
- One generated source file.
## 6. Non-Goals
- No production behavior changes.
## 7. Confirmed Decisions
- Continue without interactive clarification.
## 8. Assumptions and Open Questions
- None.
"@
  }
  "delta-spec" = @{
    file = "delta-spec.md"
    content = @"
# Delta Spec
## ADDED Requirements
- The E2E fixture exposes a workflow marker.
## MODIFIED Requirements
None.
## REMOVED Requirements
None.
"@
  }
  "delta-design" = @{
    file = "delta-design.md"
    content = @"
# Delta Design
Add one deterministic source marker and retain the existing MatSpec architecture.
"@
  }
  "tasks" = @{
    file = "tasks.md"
    content = @"
# Tasks
## Context
Inputs: validation.md
Outputs: source and refreshed full documents

### Task 1: Implement workflow marker

**Files:**
- Create: ``src/workflow-marker.js``
- Modify: ``matspec/specs/spec.md``
- Modify: ``matspec/specs/design.md``

**Context:**
Use the accepted delta documents.

**Do:**
Create the marker and refresh matspec/specs/spec.md and matspec/specs/design.md during done finalization.

**Verify:**
- [ ] Marker exists.
- [ ] Full specification and design are refreshed.

- [ ]

Report status: DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT
"@
  }
  "validation" = @{
    file = "validation.md"
    content = @"
# Validation
## Conclusion
Implementation may start.
## Checks
- Proposal, delta specification, delta design, and tasks are consistent.
"@
  }
}

try {
  New-Item -ItemType Directory -Path $work | Out-Null
  Stop-PsmuxSession
  Invoke-Psmux new -d -s $Session -n matspec -- pwsh -NoLogo -NoProfile
  Start-Sleep -Milliseconds 300
  Send-PsmuxCommand "[Console]::OutputEncoding = [Text.UTF8Encoding]::new(); `$OutputEncoding = [Text.UTF8Encoding]::new(); `$env:MATSPEC_LLM_PROVIDER = 'fake'"

  $init = Invoke-MatSpec "01-init" @("init", $work, "--integration", "none", "--no-template-update")
  Assert-True $init.ok "init failed"
  New-Item -ItemType Directory -Path (Join-Path $work "src") | Out-Null
  Set-Content -LiteralPath (Join-Path $work "src/index.js") -Value "export const ready = true;" -Encoding utf8

  $generated = Invoke-MatSpec "02-generate" @("--path", $work, "generate")
  Assert-True ($generated.status -eq "generated") "generate did not produce a generated run"
  $applied = Invoke-MatSpec "03-apply" @("--path", $work, "apply")
  Assert-True ($applied.applied.Count -eq 2) "apply did not write both full documents"
  $started = Invoke-MatSpec "04-start" @("--path", $work, "start", $change)
  Assert-True ($started.change -eq $change) "start returned the wrong change"

  $index = 5
  foreach ($entry in $stageFiles.GetEnumerator()) {
    $stage = $entry.Key
    $go = Invoke-MatSpec ("{0:D2}-{1}-go" -f $index++, $stage) @("--path", $work, "go", $change)
    Assert-True ($go.stage.key -eq $stage) "go did not enter $stage"
    Assert-True ($go.stage.command -eq "matspec.$stage") "$stage exposed the wrong command"
    Write-Stage $entry.Value.file $entry.Value.content
    $ready = Invoke-MatSpec ("{0:D2}-{1}-ready" -f $index++, $stage) @("--path", $work, "go", $change)
    if ($stage -eq "validation") {
      Assert-True ($ready.nextAction -eq "delegate-subagent") "validation did not delegate its consistency check"
      $validation = Invoke-MatSpec ("{0:D2}-validate" -f $index++) @("--path", $work, "validate", $change)
      Assert-True $validation.ok "validate rejected the default workflow fixture"
    } else {
      Assert-True ($ready.nextAction -eq "await_user_accept") "$stage did not wait for acceptance"
    }
    $accepted = Invoke-MatSpec ("{0:D2}-{1}-accept" -f $index++, $stage) @("--path", $work, "accept", $change)
    Assert-True ($accepted.acceptedStage -eq $stage) "accept confirmed the wrong stage for $stage"
  }

  $implementation = Invoke-MatSpec ("{0:D2}-implementation-go" -f $index++) @("--path", $work, "go", $change)
  Assert-True ($implementation.stage.key -eq "implementation") "implementation stage was not reached"
  Assert-True ($implementation.nextAction -eq "delegate-subagent") "implementation did not delegate task execution"
  $run = Invoke-MatSpec ("{0:D2}-implementation-run" -f $index++) @("--path", $work, "implement", $change, "--run")
  Assert-True ($run.delegate -eq "task-executor") "implementation used the wrong delegate"
  $task = Invoke-MatSpec ("{0:D2}-implementation-task" -f $index++) @("--path", $work, "implement", $change, "--task", "1")
  Assert-True ($task.task.id -eq 1) "implementation task 1 was not loaded"

  Set-Content -LiteralPath (Join-Path $work "src/workflow-marker.js") -Value "export const workflowE2E = true;" -Encoding utf8
  $complete = Invoke-MatSpec ("{0:D2}-implementation-complete" -f $index++) @("--path", $work, "implement", $change, "--complete", "1")
  Assert-True ($complete.status -eq "done") "implementation task was not completed"
  $implementationAccepted = Invoke-MatSpec ("{0:D2}-implementation-accept" -f $index++) @("--path", $work, "accept", $change)
  Assert-True ($implementationAccepted.acceptedStage -eq "implementation") "implementation was not accepted"

  $reviewEntered = Invoke-MatSpec ("{0:D2}-review-enter" -f $index++) @("--path", $work, "review", $change)
  Assert-True ($reviewEntered.stage.key -eq "review") "review stage was not entered"
  $reviewGo = Invoke-MatSpec ("{0:D2}-review-go" -f $index++) @("--path", $work, "go", $change)
  Assert-True ($reviewGo.stage.command -eq "matspec.review") "review exposed the wrong command"
  Write-Stage "review.md" @"
# Review
## Decision
Approved
## Conclusion
The workflow marker and refreshed full documents satisfy the accepted change.
"@
  $reviewReady = Invoke-MatSpec ("{0:D2}-review-ready" -f $index++) @("--path", $work, "go", $change)
  Assert-True ($reviewReady.nextAction -eq "delegate-subagent") "review did not delegate its implementation check"
  $reviewAccepted = Invoke-MatSpec ("{0:D2}-review-accept" -f $index++) @("--path", $work, "accept", $change)
  Assert-True ($reviewAccepted.acceptedStage -eq "review") "review was not accepted"

  $status = Invoke-MatSpec ("{0:D2}-status" -f $index++) @("--path", $work, "status", $change)
  $unconfirmed = @($status.stages | Where-Object status -ne "confirmed")
  Assert-True ($unconfirmed.Count -eq 0) "not all workflow stages were confirmed: $($unconfirmed.key -join ', ')"
  $blockedDone = Invoke-MatSpec -Name ("{0:D2}-done-before-finalization" -f $index++) -Arguments @("--path", $work, "done", $change) -ExpectedExit 1
  Assert-True ($blockedDone.code -eq "FULL_DOCS_NOT_UPDATED") "done did not enforce full-document finalization"
  Add-Content -LiteralPath (Join-Path $work "matspec/specs/spec.md") -Value "`n## Workflow E2E`nThe workflow marker is required." -Encoding utf8
  Add-Content -LiteralPath (Join-Path $work "matspec/specs/design.md") -Value "`n## Workflow E2E Design`nThe marker is implemented in src/workflow-marker.js." -Encoding utf8
  $done = Invoke-MatSpec ("{0:D2}-done" -f $index++) @("--path", $work, "done", $change)
  Assert-True ($done.archive -match "matspec/changes/archives/\d{4}-\d{2}-\d{2}-$change") "done did not archive the change"
  Assert-True (Test-Path -LiteralPath (Join-Path $work $done.archive)) "archive directory is missing"

  $passed = $true
  [ordered]@{
    ok = $true
    session = $Session
    workspace = if ($KeepArtifacts) { $work } else { $null }
    artifactsRetained = [bool]$KeepArtifacts
    runId = $generated.runId
    change = $change
    stages = @($status.stages | ForEach-Object { [ordered]@{ key = $_.key; status = $_.status } })
    archive = $done.archive
    steps = $steps
  } | ConvertTo-Json -Depth 6
} finally {
  if (-not $KeepSession) { Stop-PsmuxSession }
  if ($passed -and -not $KeepArtifacts) {
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    $fullWork = [IO.Path]::GetFullPath($work)
    Assert-True ($fullWork.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) "Refusing to remove non-temp path: $fullWork"
    Remove-Item -LiteralPath $fullWork -Recurse -Force
  } elseif (-not $passed) {
    Write-Warning "E2E workspace retained for diagnosis: $work"
  }
}
