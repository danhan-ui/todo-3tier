# 내 PC의 SSH 공개키를 VM에 등록해서, 이후 비밀번호 없이 ssh 접속되게 한다.
# 사용법: powershell -ExecutionPolicy Bypass -File .\scripts\setup-ssh-key.ps1 ktc-s01
param([string]$HostAlias = 'ktc-s01')
$ErrorActionPreference = 'Stop'

$key = Join-Path $HOME '.ssh\id_ed25519'
if (-not (Test-Path $key)) {
  Write-Host "SSH 키 생성: $key"
  ssh-keygen -t ed25519 -f $key -N '""' -q
}
$pub = (Get-Content "$key.pub" -Raw).Trim()

Write-Host "$HostAlias 에 공개키 등록 (VM 비밀번호를 한 번 입력하세요)"
ssh $HostAlias "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && (grep -qxF '$pub' ~/.ssh/authorized_keys || echo '$pub' >> ~/.ssh/authorized_keys)"

ssh -o BatchMode=yes $HostAlias "echo '키 접속 성공:' `$(hostname)"
