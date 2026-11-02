# 로컬 PostgreSQL에 api/.env 의 계정/DB를 만든다 (Windows, 1단계용)
# 실행하면 postgres 관리자 비밀번호를 물어봅니다.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root 'api\.env'
if (-not (Test-Path $envFile)) { throw "api\.env 가 없습니다. api\.env.example 을 복사해서 만드세요." }

$cfg = @{}
Get-Content $envFile | Where-Object { $_ -match '^\s*([A-Z_]+)=(.*)$' } | ForEach-Object { $cfg[$Matches[1]] = $Matches[2].Trim() }

$psql = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' | Sort-Object FullName -Descending | Select-Object -First 1
if (-not $psql) { throw 'psql.exe 를 찾을 수 없습니다.' }

$user = $cfg.DB_USER; $db = $cfg.DB_NAME; $pw = $cfg.DB_PASSWORD -replace "'", "''"
$sql = @"
DO `$`$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$user') THEN
    CREATE ROLE "$user" LOGIN PASSWORD '$pw';
  ELSE
    ALTER ROLE "$user" WITH LOGIN PASSWORD '$pw';
  END IF;
END `$`$;
"@

& $psql.FullName -U postgres -h localhost -v ON_ERROR_STOP=1 -c $sql
if ($LASTEXITCODE -ne 0) { throw '계정 생성 실패' }

$exists = & $psql.FullName -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname = '$db'"
if ($exists -ne '1') {
  & $psql.FullName -U postgres -h localhost -v ON_ERROR_STOP=1 -c "CREATE DATABASE `"$db`" OWNER `"$user`""
}
Write-Host "완료: 계정 '$user', DB '$db'"
