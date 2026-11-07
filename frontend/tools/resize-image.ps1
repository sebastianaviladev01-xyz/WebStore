param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Destination,
  [ValidateRange(64, 2400)][int]$Width = 480,
  [ValidateRange(1, 100)][int]$Quality = 84
)

Add-Type -AssemblyName System.Drawing
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $destinationPath) { throw "Destination already exists: $destinationPath" }

$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
$height = [Math]::Max(1, [int][Math]::Round($sourceImage.Height * ($Width / $sourceImage.Width)))
$bitmap = [System.Drawing.Bitmap]::new($Width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$encoderSettings = [System.Drawing.Imaging.EncoderParameters]::new(1)
$encoderSettings.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

try {
  $graphics.DrawImage($sourceImage, 0, 0, $Width, $height)
  $bitmap.Save($destinationPath, $encoder, $encoderSettings)
  Get-Item -LiteralPath $destinationPath | Select-Object Name, Length
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
  $sourceImage.Dispose()
  $encoderSettings.Dispose()
}
