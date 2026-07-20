param(
  [string]$Project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$SourceRepository = (Resolve-Path (Join-Path $PSScriptRoot "../../repos/echo")).Path,
  [string]$HistoricalCommit = "dac56bceda4c9e799afc3cee2d4f137c8102db58",
  [string]$Change = "REQ20260527-must-unix-time-docs",
  [string]$Model = "gpt-5.5",
  [string]$Session = "matspec-codex-history-e2e-$PID",
  [int]$TimeoutSeconds = 900,
  [string]$ResumeRepository = "",
  [switch]$KeepArtifacts,
  [switch]$KeepSession
)

$ErrorActionPreference = "Stop"
$repo = if ($ResumeRepository) { (Resolve-Path -LiteralPath $ResumeRepository).Path } else { "" }
$experiment = if ($repo) { Split-Path $repo } else { Join-Path ([IO.Path]::GetTempPath()) "matspec-codex-history-$([guid]::NewGuid().ToString('N'))" }
if (-not $repo) { $repo = Join-Path $experiment "repo" }
$logs = Join-Path $experiment "logs"
$cli = Join-Path $Project "bin/matspec.js"
$node = (Get-Command node -ErrorAction Stop).Source
$codex = (Get-Command codex -ErrorAction Stop).Source
$steps = [Collections.Generic.List[object]]::new()
$passed = $false

$requirement = @"
Reproduce historical Echo change $HistoricalCommit.
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
    $pane = (& psmux capture-pane -p -t $Session) -join "`n"
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
  $args = @(
    "exec", "-C", $repo, "--sandbox", "workspace-write", "--ephemeral",
    "--json", "--output-last-message", $lastFile
  )
  if ($Model) { $args += @("--model", $Model) }
  $args += "-"
  $argumentText = ($args | ForEach-Object { Quote-Single $_ }) -join " "
  $marker = "__CODEX_HISTORY_$([guid]::NewGuid().ToString('N'))__"
  $command = "Get-Content -Raw -LiteralPath $(Quote-Single $promptFile) | & $(Quote-Single $codex) $argumentText *> $(Quote-Single $eventsFile); " +
    "`$stepExit = `$LASTEXITCODE; Write-Output `"$marker`:`$stepExit`""
  Send-PsmuxCommand $command
  $exitCode = Wait-PsmuxMarker $marker
  $last = if (Test-Path -LiteralPath $lastFile) { (Get-Content -Raw -LiteralPath $lastFile).Trim() } else { "" }
  Assert-True ($exitCode -eq 0) "$Name failed with exit code $exitCode. See $eventsFile"
  Assert-True ($last.Length -gt 0) "$Name did not write a final response. See $eventsFile"
  $steps.Add([ordered]@{
    name = $Name
    kind = "codex"
    exitCode = $exitCode
    code = $null
    seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)
  }) | Out-Null
  return $last
}

function New-StagePrompt {
  param([string]$Skill, [string]$Stage)
  $skillReference = '$' + $Skill
  $extra = if ($Stage -eq "tasks") {
    @"
Create exactly one parsed implementation task for the binder.go documentation correction and its Go verification. Record the required full-spec/full-design finalization in a separate section that is not another "### Task N"; finalization will run only after review establishes the baseline.
"@
  } else { "" }
  return @"
This is a controlled MatSpec historical-requirement end-to-end experiment.

Use $skillReference and generate the current $Stage artifact now. Generation is explicitly authorized. All clarification defaults are approved and there are no open questions.

Confirmed requirement:
$requirement

Inspect the repository and confirmed MatSpec inputs. Write only the allowed current-stage artifact, do not confirm it, do not advance the workflow, and do not implement the change.
$extra
"@
}

if (-not (Get-Command psmux -ErrorAction SilentlyContinue)) { throw "psmux is required but was not found on PATH." }
Assert-True (Test-Path -LiteralPath $cli) "MatSpec CLI not found: $cli"
Assert-True (Test-Path -LiteralPath (Join-Path $SourceRepository ".git")) "Source repository is not a Git checkout: $SourceRepository"

try {
  New-Item -ItemType Directory -Path $logs -Force | Out-Null
  $oraclePatch = Join-Path $logs "historical-oracle.patch"
  if (-not $ResumeRepository) {
    Invoke-Native "clone source repository" { git clone --quiet --no-hardlinks $SourceRepository $repo }
    $remote = (git -C $SourceRepository remote get-url origin).Trim()
    Invoke-Native "set upstream remote" { git -C $repo remote set-url origin $remote }
    Invoke-Native "fetch historical commit" { git -C $repo fetch --quiet --depth=2 origin $HistoricalCommit }
    $baseCommit = (git -C $repo rev-parse "$HistoricalCommit^").Trim()
    Assert-True ($baseCommit -match "^[a-f0-9]{40}$") "Historical parent commit was not fetched."
    Invoke-Native "checkout historical parent" { git -C $repo checkout --quiet -B matspec-history-e2e $baseCommit }
    git -C $repo diff $baseCommit $HistoricalCommit -- binder.go | Set-Content -LiteralPath $oraclePatch -Encoding utf8
  } else {
    $baseCommit = (git -C $repo rev-parse HEAD).Trim()
  }
  Assert-True ((Get-Content -Raw $oraclePatch) -match "MustUnixTime") "Historical commit does not contain the expected binder change."

  Stop-PsmuxSession
  Invoke-Psmux new -d -s $Session -n codex-history -- pwsh -NoLogo -NoProfile
  Start-Sleep -Milliseconds 500
  $readyMarker = "__MATSPEC_HISTORY_READY_$([guid]::NewGuid().ToString('N'))__"
  Send-PsmuxCommand "[Console]::OutputEncoding = [Text.UTF8Encoding]::new(); `$OutputEncoding = [Text.UTF8Encoding]::new(); `$env:MATSPEC_NO_REPORT = '1'; Set-Location -LiteralPath $(Quote-Single $repo); Write-Output `"${readyMarker}:0`""
  Assert-True ((Wait-PsmuxMarker $readyMarker) -eq 0) "psmux shell setup failed"

  if (-not $ResumeRepository) {
    $init = Invoke-MatSpec "01-init" @("init", $repo, "--integration", "codex", "--no-template-update")
    Assert-True $init.ok "init failed"

    $generated = Invoke-MatSpec "02-generate" @("--path", $repo, "generate", "--runner", "codex", "--mode", "direct", "--model", $Model)
    Assert-True ($generated.status -eq "generated") "Codex generate did not produce a completed run"
    Assert-True ($generated.summary.runner -eq "codex") "generate used $($generated.summary.runner), expected codex"
    $applied = Invoke-MatSpec "03-apply" @("--path", $repo, "apply")
    Assert-True ($applied.applied.Count -eq 2) "apply did not publish both full documents"
    $started = Invoke-MatSpec "04-start" @("--path", $repo, "start", $Change)
    Assert-True ($started.change -eq $Change) "start returned the wrong change"

    $stageSkills = [ordered]@{
      "proposal" = "matspec-proposal"
      "delta-spec" = "matspec-delta-spec"
      "delta-design" = "matspec-delta-design"
      "tasks" = "matspec-tasks"
      "validation" = "matspec-validation"
    }
    $index = 5
    foreach ($entry in $stageSkills.GetEnumerator()) {
      $go = Invoke-MatSpec ("{0:D2}-{1}-go" -f $index++, $entry.Key) @("--path", $repo, "go", $Change)
      Assert-True ($go.stage.key -eq $entry.Key) "go did not enter $($entry.Key)"
      Invoke-Codex ("{0:D2}-{1}-codex" -f $index++, $entry.Key) (New-StagePrompt $entry.Value $entry.Key) | Out-Null
      $ready = Invoke-MatSpec ("{0:D2}-{1}-ready" -f $index++, $entry.Key) @("--path", $repo, "go", $Change)
      $expectedAction = if ($entry.Key -eq "validation") { "delegate-subagent" } else { "await_user_accept" }
      Assert-True ($ready.nextAction -eq $expectedAction) "$($entry.Key) was not ready for acceptance"
      $accepted = Invoke-MatSpec ("{0:D2}-{1}-accept" -f $index++, $entry.Key) @("--path", $repo, "accept", $Change)
      Assert-True ($accepted.acceptedStage -eq $entry.Key) "accepted the wrong stage"
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
    $index = 27
    $runId = (Get-ChildItem (Join-Path $repo ".matspec-cli/runs") -Directory | Sort-Object Name | Select-Object -Last 1).Name
    $generated = [pscustomobject]@{ runId = $runId }
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
  $reviewPrompt = @"
This is a controlled MatSpec historical-requirement end-to-end experiment.
Use `$matspec-review to review the completed implementation now. Compare binder.go with the confirmed proposal, deltas, tasks, validation, and test evidence. Write only the allowed review.md artifact. Do not confirm, finalize full documents, or archive.
"@
  Invoke-Codex ("{0:D2}-review-codex" -f $index++) $reviewPrompt | Out-Null
  $reviewReady = Invoke-MatSpec ("{0:D2}-review-ready" -f $index++) @("--path", $repo, "go", $Change)
  Assert-True ($reviewReady.nextAction -eq "delegate-subagent") "review was not ready for acceptance"
  $reviewAccepted = Invoke-MatSpec ("{0:D2}-review-accept" -f $index++) @("--path", $repo, "accept", $Change)
  Assert-True ($reviewAccepted.acceptedStage -eq "review") "review was not accepted"

  $blockedDone = Invoke-MatSpec -Name ("{0:D2}-done-before-finalization" -f $index++) -Arguments @("--path", $repo, "done", $Change) -ExpectedExit 1
  Assert-True ($blockedDone.code -eq "FULL_DOCS_NOT_UPDATED") "done did not enforce post-review full-document finalization"
  $finalizationPrompt = @"
This is the done-finalization step for the accepted MatSpec change $Change.
Read the confirmed delta-spec.md, delta-design.md, review.md, and the actual binder.go change. Update only matspec/specs/spec.md and matspec/specs/design.md so the full authoritative documents include this accepted documentation correction and its design impact. Do not modify source files, confirm stages, or call matspec done.
"@
  Invoke-Codex ("{0:D2}-finalization-codex" -f $index++) $finalizationPrompt | Out-Null
  $done = Invoke-MatSpec ("{0:D2}-done" -f $index++) @("--path", $repo, "done", $Change)
  Assert-True ($done.archive -match "matspec/changes/archives/\d{4}-\d{2}-\d{2}-$Change") "done did not archive the change"

  $status = git -C $repo status --short
  $sourceDiff = git -C $repo diff -- binder.go
  $passed = $true
  [ordered]@{
    ok = $true
    session = $Session
    workspace = if ($KeepArtifacts) { $repo } else { $null }
    logs = if ($KeepArtifacts) { $logs } else { $null }
    artifactsRetained = [bool]$KeepArtifacts
    sourceRepository = $SourceRepository
    historicalCommit = $HistoricalCommit
    baseCommit = $baseCommit
    change = $Change
    model = $Model
    runId = $generated.runId
    archive = $done.archive
    sourceDiffMatchesOracle = (
      (($sourceDiff -join "`n") -replace "`r`n", "`n").Trim() -eq
      ((Get-Content -Raw $oraclePatch) -replace "`r`n", "`n").Trim()
    )
    gitStatus = $status
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
