# Function to remove Git repository
function Remove-GitRepo {
    param (
        [string]$path
    )
    
    Write-Host "Checking $path..." -ForegroundColor Yellow
    
    # Check if directory exists
    if (Test-Path $path) {
        # Remove .git directory if it exists
        if (Test-Path "$path/.git") {
            Write-Host "Removing Git repository in $path" -ForegroundColor Green
            Remove-Item -Path "$path/.git" -Recurse -Force
        }
        
        # Remove other Git-related files
        $gitFiles = @(
            ".gitignore",
            ".gitattributes",
            ".gitmodules"
        )
        
        foreach ($file in $gitFiles) {
            if (Test-Path "$path/$file") {
                Write-Host "Removing $file in $path" -ForegroundColor Green
                Remove-Item -Path "$path/$file" -Force
            }
        }
    }
}

# Directories to check
$directories = @(
    ".",
    "./frontend",
    "./backend",
    "./hedge-fund-ai",
    "./ai"
)

Write-Host "Starting Git cleanup process..." -ForegroundColor Cyan

foreach ($dir in $directories) {
    Remove-GitRepo $dir
}

Write-Host "`nGit cleanup complete!" -ForegroundColor Green
Write-Host "All Git repositories and related files have been removed." -ForegroundColor Green
Write-Host "The project is now disconnected from GitHub." -ForegroundColor Green 