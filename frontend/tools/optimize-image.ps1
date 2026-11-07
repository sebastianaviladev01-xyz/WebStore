param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Destination,
  [ValidateRange(1, 100)][int]$Quality = 88
)

# Re-encode final generated assets for web delivery. No crop or visual alteration.
Add-Type -AssemblyName System.Drawing
$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $Source).Path)
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$encoderSettings = [System.Drawing.Imaging.EncoderParameters]::new(1)
$encoderSettings.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
try {
  $destinationPath = [System.IO.Path]::GetFullPath($Destination)
  if (Test-Path -LiteralPath $destinationPath) { throw "Destination already exists: $destinationPath" }
  $sourceImage.Save($destinationPath, $encoder, $encoderSettings)
  Get-Item -LiteralPath $destinationPath | Select-Object Name, Length
} finally {
  $sourceImage.Dispose()
  $encoderSettings.Dispose()
}
