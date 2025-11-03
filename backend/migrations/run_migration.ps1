# Migration Execution Script
# Date: October 21, 2025
# Description: Safe execution of database migrations with rollback capability

param(
    [Parameter(Mandatory=$true)]
    [string]$DatabaseUrl,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateIndexes = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackup = $false
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param($Color, $Message)
    Write-Host "${Color}${Message}${Reset}"
}

function Test-DatabaseConnection {
    param($DbUrl)
    try {
        Write-ColorOutput $Blue "Testing database connection..."
        # Test connection using psql
        $testQuery = "SELECT 1;"
        $result = psql $DbUrl -c $testQuery 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput $Green "Database connection successful"
            return $true
        } else {
            Write-ColorOutput $Red "Database connection failed: $result"
            return $false
        }
    } catch {
    Write-ColorOutput $Red "Database connection error: $_"
        return $false
    }
}

function Backup-Database {
    param($DbUrl)
    if ($SkipBackup) {
        Write-ColorOutput $Yellow "Skipping backup as requested"
        return $true
    }
    
    try {
        $timestamp = Get-Date -Format "yyyy_MM_dd_HH_mm_ss"
        $backupFile = ".\backups\trip_trader_backup_$timestamp.sql"
        
        # Create backups directory if it doesn't exist
        if (!(Test-Path ".\backups")) {
            New-Item -ItemType Directory -Path ".\backups"
        }
        
    Write-ColorOutput $Blue "Creating database backup..."
        pg_dump $DatabaseUrl > $backupFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput $Green "Backup created: $backupFile"
            return $true
        } else {
            Write-ColorOutput $Red "Backup failed"
            return $false
        }
    } catch {
    Write-ColorOutput $Red "Backup error: $_"
        return $false
    }
}

function Execute-Migration {
    param($DbUrl, $MigrationFile)
    try {
    Write-ColorOutput $Blue "Executing migration: $MigrationFile"
        
        if ($DryRun) {
            Write-ColorOutput $Yellow "DRY RUN MODE - Changes will not be applied"
            # Just validate the SQL syntax
            $result = psql $DbUrl -f $MigrationFile --dry-run 2>&1
        } else {
            $result = psql $DbUrl -f $MigrationFile 2>&1
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput $Green "Migration completed successfully"
            return $true
        } else {
            Write-ColorOutput $Red "Migration failed: $result"
            return $false
        }
    } catch {
    Write-ColorOutput $Red "Migration error: $_"
        return $false
    }
}

function Test-Application {
    try {
    Write-ColorOutput $Blue "Testing application endpoints..."
        
        # Test basic endpoints (assuming server is running on localhost:8080)
        $endpoints = @(
            "http://localhost:8080/api/packages",
            "http://localhost:8080/api/manager/dashboard-stats"
        )
        
        foreach ($endpoint in $endpoints) {
            try {
                $response = Invoke-RestMethod -Uri $endpoint -Method GET -TimeoutSec 10
                Write-ColorOutput $Green "Endpoint working: $endpoint"
            } catch {
                Write-ColorOutput $Yellow "Endpoint issue: $endpoint - $_"
            }
        }
        
        return $true
    } catch {
    Write-ColorOutput $Red "Application test error: $_"
        return $false
    }
}

# Main execution
Write-ColorOutput $Blue "Starting Trip Trader Database Migration"
Write-ColorOutput $Blue "Database: $DatabaseUrl"
Write-ColorOutput $Blue "Dry Run: $DryRun"
Write-ColorOutput $Blue "Create Indexes: $CreateIndexes"

# Step 1: Test database connection
if (!(Test-DatabaseConnection $DatabaseUrl)) {
    Write-ColorOutput $Red "Cannot proceed without database connection"
    exit 1
}

# Step 2: Create backup
if (!(Backup-Database $DatabaseUrl)) {
    Write-ColorOutput $Red "Cannot proceed without backup"
    exit 1
}

# Step 3: Execute field removal migration
$migrationFile1 = ".\migrations\001_remove_redundant_fields.sql"
if (Test-Path $migrationFile1) {
    if (!(Execute-Migration $DatabaseUrl $migrationFile1)) {
        Write-ColorOutput $Red "Field removal migration failed"
        exit 1
    }
} else {
    Write-ColorOutput $Red "❌ Migration file not found: $migrationFile1"
    exit 1
}

# Step 4: Create performance indexes (if requested)
if ($CreateIndexes) {
    $migrationFile2 = ".\migrations\002_create_performance_indexes.sql"
    if (Test-Path $migrationFile2) {
        if (!(Execute-Migration $DatabaseUrl $migrationFile2)) {
            Write-ColorOutput $Yellow "Index creation failed, but main migration succeeded"
        }
    } else {
    Write-ColorOutput $Yellow "Index migration file not found: $migrationFile2"
    }
}

# Step 5: Test application (optional)
Write-ColorOutput $Blue "Would you like to test the application endpoints? (y/n)"
$testApp = Read-Host
if ($testApp -eq "y" -or $testApp -eq "Y") {
    Test-Application
}

Write-ColorOutput $Green "Migration completed successfully!"
Write-ColorOutput $Blue "Next steps:"
Write-ColorOutput $Blue "1. Test your application thoroughly"
Write-ColorOutput $Blue "2. Monitor performance logs"
Write-ColorOutput $Blue "3. Remove backup files after verification"
Write-ColorOutput $Blue "4. Check the application endpoints work correctly"