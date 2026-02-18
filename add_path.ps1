$currentPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
if ($currentPath -notlike '*msys64\ucrt64\bin*') {
    [Environment]::SetEnvironmentVariable('PATH', $currentPath + ';C:\msys64\ucrt64\bin', 'User')
    Write-Host 'Added C:\msys64\ucrt64\bin to user PATH'
} else {
    Write-Host 'Already in PATH'
}
