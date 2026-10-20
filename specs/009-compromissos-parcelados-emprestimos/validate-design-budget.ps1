# Valida somente aritmética documental; não compila ou avalia Firestore Rules.
$ErrorActionPreference = 'Stop'
$budgetCases = @()
foreach ($holderPresent in 0..1) {
 foreach ($plannedAccountPresent in 0..1) {
  foreach ($labelCount in 0..5) {
   foreach ($firstCategoryUse in 0..1) {
    $seriesWrite = 2 + $holderPresent + $plannedAccountPresent
    $receiptWrite = 2 + $labelCount
    $categoryWrite = 2 * $firstCategoryUse
    $createReads = 1 + $firstCategoryUse
    $editReads = 2 + $firstCategoryUse
    $replacementReceipt = 3 + $labelCount
    $replacementReads = 2 + $firstCategoryUse
    $createTotal = $seriesWrite + $receiptWrite + $categoryWrite + $createReads
    $editTotal = $seriesWrite + $receiptWrite + $categoryWrite + $editReads
    $replacementTotal = 1 + $seriesWrite + $replacementReceipt + $categoryWrite + $replacementReads
    if ($createTotal -ne (5+$holderPresent+$plannedAccountPresent+$labelCount+3*$firstCategoryUse)) { throw 'Create formula mismatch' }
    if ($editTotal -ne (6+$holderPresent+$plannedAccountPresent+$labelCount+3*$firstCategoryUse)) { throw 'Edit formula mismatch' }
    if ($replacementTotal -ne (8+$holderPresent+$plannedAccountPresent+$labelCount+3*$firstCategoryUse)) { throw 'Replacement formula mismatch' }
    if ($createTotal -gt 18 -or $editTotal -gt 18 -or $replacementTotal -gt 18) { throw 'Total access budget exceeded' }
    if ($seriesWrite -gt 8 -or $receiptWrite -gt 8 -or $replacementReceipt -gt 8 -or $categoryWrite -gt 8) { throw 'Per-write access budget exceeded' }
    if ((3+$firstCategoryUse) -gt 32) { throw 'Write budget exceeded' }
    $budgetCases += [pscustomobject]@{create=$createTotal;edit=$editTotal;replace=$replacementTotal}
   }
  }
 }
}
$createMaximum = ($budgetCases | Measure-Object create -Maximum).Maximum
$editMaximum = ($budgetCases | Measure-Object edit -Maximum).Maximum
$replaceMaximum = ($budgetCases | Measure-Object replace -Maximum).Maximum
if ($budgetCases.Count -ne 48 -or $createMaximum -ne 15 -or $editMaximum -ne 16 -or $replaceMaximum -ne 18) { throw 'Unexpected document maxima' }
$otherCommands = @{cancel=1+2+2;pay=2+2+2+3;reverse=3+3+1+4;link=1+1+4+4}
foreach ($entry in $otherCommands.GetEnumerator()) { if ($entry.Value -gt 18) { throw "Budget exceeded for $($entry.Key)" } }
[pscustomobject]@{
 scope='documented-call-graph-only'; combinationsPerStructuralCommand=$budgetCases.Count
 maxCreate=$createMaximum; maxEdit=$editMaximum; maxReplace=$replaceMaximum
 otherCommands=$otherCommands; expressions='not-measured'; realBytes='not-measured'
 rulesEvaluation='not-run'; deployment='not-run'
} | ConvertTo-Json -Depth 3
