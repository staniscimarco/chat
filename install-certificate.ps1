# Script per installare il certificato CA in Windows
# Deve essere eseguito come amministratore

Write-Host "🔒 Installazione certificato CA per PDF-AI..." -ForegroundColor Green

# Verifica se il file CA esiste
if (-not (Test-Path "ca.crt")) {
    Write-Host "❌ File ca.crt non trovato!" -ForegroundColor Red
    Write-Host "💡 Assicurati di eseguire questo script dalla cartella del progetto" -ForegroundColor Yellow
    exit 1
}

# Verifica privilegi di amministratore
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "❌ Questo script richiede privilegi di amministratore!" -ForegroundColor Red
    Write-Host "💡 Fai clic destro su PowerShell e seleziona 'Esegui come amministratore'" -ForegroundColor Yellow
    Write-Host "💡 Poi naviga alla cartella del progetto e esegui: .\install-certificate.ps1" -ForegroundColor Yellow
    exit 1
}

try {
    # Installa il certificato CA nell'archivio "Autorità di certificazione radice attendibili"
    Write-Host "📥 Installazione certificato CA..." -ForegroundColor Yellow
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("ca.crt")
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
    
    Write-Host "✅ Certificato CA installato con successo!" -ForegroundColor Green
    Write-Host "🔄 Riavvia il browser per applicare le modifiche" -ForegroundColor Yellow
    Write-Host "🌐 Ora https://192.168.1.86:3000 dovrebbe essere considerato sicuro" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Errore durante l'installazione: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Prova a eseguire manualmente: certutil -addstore -f 'ROOT' ca.crt" -ForegroundColor Yellow
}

Write-Host "`n📝 Note:" -ForegroundColor White
Write-Host "   - Il certificato è valido solo per questo PC" -ForegroundColor Gray
Write-Host "   - Altri dispositivi dovranno accettare manualmente il certificato" -ForegroundColor Gray
Write-Host "   - Per rimuovere: certutil -delstore 'ROOT' 'mkcert development CA'" -ForegroundColor Gray 