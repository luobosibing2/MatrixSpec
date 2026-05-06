param(
  [ValidateSet("codex", "opencode")]
  [string]$Agent = "codex",

  [string]$Project = (Get-Location).Path,

  [string]$Session = "matspec-e2e",

  [string]$Prompt = "",

  [ValidateSet("auto", "tui", "run")]
  [string]$Mode = "auto",

  [string[]]$Turns = @(),

  [string[]]$Expect = @(),

  [int]$StartupSeconds = 6,

  [int]$TurnSeconds = 10,

  [switch]$KeepSession
)

$ErrorActionPreference = "Stop"

function Invoke-Psmux {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  & psmux @Args
  if ($LASTEXITCODE -ne 0) {
    throw "psmux $($Args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Stop-SessionIfExists {
  param([string]$Name)
  & psmux has-session -t $Name *> $null
  if ($LASTEXITCODE -eq 0) {
    & psmux kill-session -t $Name *> $null
  }
}

function Send-Turn {
  param(
    [string]$Name,
    [string]$Text
  )

  Invoke-Psmux set-buffer $Text
  Invoke-Psmux paste-buffer -t $Name
  Start-Sleep -Milliseconds 200
  Invoke-Psmux send-keys -t $Name Enter
}

function Capture-Transcript {
  param([string]$Name)
  return (& psmux capture-pane -p -t $Name) -join "`n"
}

function Quote-PowerShellSingle {
  param([string]$Text)
  return "'" + ($Text -replace "'", "''") + "'"
}

if (-not (Get-Command psmux -ErrorAction SilentlyContinue)) {
  throw "psmux is required but was not found on PATH."
}

if (-not (Test-Path -LiteralPath $Project)) {
  throw "Project path does not exist: $Project"
}

if ($Mode -eq "auto") {
  $Mode = if ($Agent -eq "opencode") { "run" } else { "tui" }
}

Stop-SessionIfExists $Session

Invoke-Psmux new -d -s $Session -n $Agent -- pwsh -NoLogo
Start-Sleep -Milliseconds 500

Send-Turn $Session "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); `$OutputEncoding = [System.Text.UTF8Encoding]::new(); chcp 65001 > `$null; Set-Location -LiteralPath '$Project'"
Start-Sleep -Milliseconds 500

if ($Mode -eq "run") {
  if ($Prompt.Trim().Length -eq 0) {
    throw "-Prompt is required when -Mode run is used."
  }

  $quotedPrompt = Quote-PowerShellSingle $Prompt

  if ($Agent -eq "codex") {
    Send-Turn $Session "codex exec --json --cd '$Project' --sandbox read-only --ask-for-approval never $quotedPrompt"
  } else {
    Send-Turn $Session "opencode run --pure --format json --dir '$Project' --dangerously-skip-permissions $quotedPrompt"
  }

  Start-Sleep -Seconds $TurnSeconds
} else {
  if ($Agent -eq "codex") {
    Send-Turn $Session "codex --no-alt-screen --cd '$Project'"
  } else {
    Send-Turn $Session "opencode '$Project' --pure"
  }

  Start-Sleep -Seconds $StartupSeconds

  if ($Prompt.Trim().Length -gt 0) {
    Send-Turn $Session $Prompt
    Start-Sleep -Seconds $TurnSeconds
  }

  foreach ($turn in $Turns) {
    Send-Turn $Session $turn
    Start-Sleep -Seconds $TurnSeconds
  }
}

$transcript = Capture-Transcript $Session
$failed = @()

foreach ($pattern in $Expect) {
  if ($transcript -notmatch $pattern) {
    $failed += $pattern
  }
}

$result = [ordered]@{
  ok = $failed.Count -eq 0
  agent = $Agent
  mode = $Mode
  project = (Resolve-Path -LiteralPath $Project).Path
  session = $Session
  expected = $Expect
  missing = $failed
  transcript = $transcript
}

$result | ConvertTo-Json -Depth 5

if (-not $KeepSession) {
  Stop-SessionIfExists $Session
}

if ($failed.Count -gt 0) {
  exit 1
}
