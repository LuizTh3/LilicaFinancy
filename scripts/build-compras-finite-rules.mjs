import fs from 'node:fs'
import crypto from 'node:crypto'

// Reviewable complete source, generated locally. Never deploys or reads credentials.
const root = new URL('../', import.meta.url), dir = new URL('specs/007-compras-cartao-parceladas/', root)
const base = fs.readFileSync(new URL('firestore.rules', root), 'utf8')
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
let candidate = base
function replaceOnce(from, to) {
  if (!candidate.includes(from) || candidate.indexOf(from) !== candidate.lastIndexOf(from)) throw Error('UNEXPECTED_BASE_SOURCE')
  candidate = candidate.replace(from, () => to)
}
const extension = String.raw`
    // Candidate 007 finite creation only; no payment, edit, cancellation or migration capability.
    function p7Path(uid,c,id) { return /databases/$(database)/documents/users/$(uid)/$(c)/$(id); }
    function p7Money(v) { return v is int && v>=0 && v<=9007199254740991; }
    function p7ImageKeys() { return ['cartaoId','descricao','dataCompra','categoriaId','etiquetaIds','valorTotalCentavos','quantidadeParcelas','primeiraCompetenciaFatura','schemaVersion','version','cronogramaRevision','primeiraFaturaEscolha','parcelas','competenciasFaturas','estadoObrigacao']; }
    function p7Capacity(p,category) {
      let c=p.capacidade;
      return c is map && c.keys().hasAll(['schemaVersion','valorOriginalCentavos','correcaoAcrescimosCentavos','correcaoReducoesCentavos','devolvidoCentavos','categoriaEfetivaId'])
        && c.keys().hasOnly(['schemaVersion','valorOriginalCentavos','correcaoAcrescimosCentavos','correcaoReducoesCentavos','devolvidoCentavos','categoriaEfetivaId'])
        && c.schemaVersion is int && c.schemaVersion==1 && c.valorOriginalCentavos==p.valorCentavos
        && c.correcaoAcrescimosCentavos is int && c.correcaoAcrescimosCentavos==0
        && c.correcaoReducoesCentavos is int && c.correcaoReducoesCentavos==0
        && c.devolvidoCentavos is int && c.devolvidoCentavos==0 && c.categoriaEfetivaId==category;
    }
    function p7Position(d,key,n) {
      let p=d.parcelas.get(key,null);
      let remainder=d.valorTotalCentavos%d.quantidadeParcelas;
      let q=int((d.valorTotalCentavos-remainder) / d.quantidadeParcelas);
      return n>d.quantidadeParcelas ? p==null : p is map
        && p.keys().hasAll(['numero','quantidadeOriginal','valorCentavos','competenciaFatura','faturaId','capacidade'])
        && p.keys().hasOnly(['numero','quantidadeOriginal','valorCentavos','competenciaFatura','faturaId','capacidade'])
        && p.numero is int && p.numero==n && p.quantidadeOriginal is int && p.quantidadeOriginal==d.quantidadeParcelas
        && p.valorCentavos is int && p.valorCentavos>0 && p.valorCentavos==q+(n<=remainder ? 1:0)
        && p.competenciaFatura==invoiceMonth(invoiceMonthIndex(d.primeiraCompetenciaFatura)+n-1)
        && p.faturaId==d.cartaoId+'__'+p.competenciaFatura;
    }
    function p7Body(d) {
      return d is map && d.keys().hasAll(p7ImageKeys().concat(['ultimoEventoId','createdAt','updatedAt','comandoAtual']))
        && d.keys().hasOnly(p7ImageKeys().concat(['ultimoEventoId','createdAt','updatedAt','comandoAtual']))
        && safeId(d.cartaoId) && safeId(d.categoriaId) && externalText(d.descricao,120) && calendarDate(d.dataCompra)
        && (d.etiquetaIds is list && d.etiquetaIds.size()==0 || labelShape(d.etiquetaIds)) && p7Money(d.valorTotalCentavos) && d.valorTotalCentavos>0
        && d.quantidadeParcelas is int && d.quantidadeParcelas>=1 && d.quantidadeParcelas<=3
        && d.schemaVersion is int && d.schemaVersion==2 && d.version is int && d.version==1
        && d.cronogramaRevision is int && d.cronogramaRevision==1 && d.estadoObrigacao=='ativa'
        && d.primeiraFaturaEscolha in ['sugerida','explicita'] && validMonth(d.primeiraCompetenciaFatura)
        && d.createdAt==request.time && d.updatedAt==request.time && d.ultimoEventoId is string
        && d.ultimoEventoId.matches('^criarCompra__[A-Za-z0-9-]{1,64}$')
        && d.parcelas is map && d.parcelas.keys().hasOnly(['p01','p02','p03']) && d.parcelas.size()==d.quantidadeParcelas
        && d.competenciasFaturas==[d.parcelas.p01.competenciaFatura].concat(d.quantidadeParcelas>1 ? [d.parcelas.p02.competenciaFatura]:[]).concat(d.quantidadeParcelas>2 ? [d.parcelas.p03.competenciaFatura]:[]);
    }
    function p7Command(d) {
      let c=d.comandoAtual;
      return c is map && c.keys().hasAll(['tipo','eventoId','cartaoVersion','expectedVersion','resultVersion','antes','depois','faturas'])
        && c.keys().hasOnly(['tipo','eventoId','cartaoVersion','expectedVersion','resultVersion','antes','depois','faturas'])
        && c.tipo=='criarCompra' && c.eventoId==d.ultimoEventoId && safeVersion(c.cartaoVersion)
        && c.expectedVersion is int && c.expectedVersion==0 && c.resultVersion is int && c.resultVersion==1 && c.antes==null
        && c.depois is map && c.depois.keys().hasAll(p7ImageKeys()) && c.depois.keys().hasOnly(p7ImageKeys())
        && c.depois.diff(d).affectedKeys().hasOnly(['ultimoEventoId','createdAt','updatedAt','comandoAtual'])
        && c.faturas is map && c.faturas.size()==d.quantidadeParcelas
        && c.faturas.keys().hasOnly([d.parcelas.p01.faturaId].concat(d.quantidadeParcelas>1 ? [d.parcelas.p02.faturaId]:[]).concat(d.quantidadeParcelas>2 ? [d.parcelas.p03.faturaId]:[]));
    }
    function p7Open(f) {
      let local=request.time-duration.value(5,'h');
      return local.year()*10000+local.month()*100+local.day()<int(f.fechamento[0:4])*10000+int(f.fechamento[5:7])*100+int(f.fechamento[8:10]);
    }
    function p7Destination(uid,id,d,key,n) {
      return n>d.quantidadeParcelas || p7DestinationPresent(uid,id,d,d.parcelas[key],n);
    }
    function p7DestinationPresent(uid,id,d,p,n) {
      let f=getAfter(p7Path(uid,'faturas',p.faturaId)).data;
      let t=d.comandoAtual.faturas[p.faturaId];
      return f.versaoConteudo==4 && f.conteudo.version==t.resultVersion && f.conteudo.ultimoEventoId==d.ultimoEventoId
        && f.conteudo.ultimoEventoOrigemId==id && f.conteudo.updatedAt==request.time;
    }
    function p7Create(uid,id) {
      let d=request.resource.data;
      let r=getAfter(p7Path(uid,'operacoesCompras',d.ultimoEventoId)).data;
      let card=getAfter(p7Path(uid,'cartoes',d.cartaoId)).data;
      let cat=getAfter(p7Path(uid,'categorias',d.categoriaId)).data;
      return safeId(id) && p7Body(d)
        && r.compraId==id && r.comando==d.comandoAtual && r.createdAt==request.time
        && card.schemaVersion==1 && card.estado=='ativo' && card.version==d.comandoAtual.cartaoVersion
        && cat.schemaVersion==2 && cat.estado=='ativo' && cat.natureza=='despesa' && validUse('categorias',cat.usoFinanceiro)
        && 7+3*d.quantidadeParcelas+d.etiquetaIds.size()+(cat.usoFinanceiro.eventoId==d.ultimoEventoId ? 3:0)<=18
        && p7Destination(uid,id,d,'p01',1) && p7Destination(uid,id,d,'p02',2) && p7Destination(uid,id,d,'p03',3);
    }
    function p7Receipt(uid,id) {
      let r=request.resource.data;
      let d=getAfter(p7Path(uid,'compras',r.compraId)).data;
      return r.keys().hasAll(['schemaVersion','contractVersion','tipo','operationKey','compraId','comando','createdAt'])
        && r.keys().hasOnly(['schemaVersion','contractVersion','tipo','operationKey','compraId','comando','createdAt'])
        && r.schemaVersion is int && r.schemaVersion==1 && r.contractVersion is int && r.contractVersion==1
        && safeId(r.operationKey) && safeId(r.compraId) && r.tipo=='criarCompra' && id==r.tipo+'__'+r.operationKey
        && r.createdAt==request.time && d.ultimoEventoId==id && d.version==1 && d.createdAt==request.time
        && r.comando==d.comandoAtual && p7Command(d) && externalLabels(uid,d);
    }
    function p7Control(c) {
      let keys=['schemaVersion','version','exigivelCentavos','liquidadoLiquidoCentavos','possuiHistoricoPagamento','revisaoEstado','ultimoEventoTipo','ultimoEventoId','createdAt','updatedAt'];
      return c is map && c.keys().hasAll(keys) && c.keys().hasOnly(keys.concat(['ultimoEventoOrigemId']))
        && c.schemaVersion is int && c.schemaVersion==2 && safeVersion(c.version)
        && p7Money(c.exigivelCentavos) && c.liquidadoLiquidoCentavos is int && c.liquidadoLiquidoCentavos==0
        && c.possuiHistoricoPagamento==false && c.revisaoEstado=='normal'
        && c.createdAt is timestamp && c.updatedAt is timestamp && c.updatedAt>=c.createdAt;
    }
    function p7InvoiceV4Doc(d) {
      let keys=invoiceKeys().concat(['schemaVersion','versaoConteudo','version','ultimoEventoId','createdAt','updatedAt','conteudo']);
      return d is map && d.keys().hasAll(keys) && d.keys().hasOnly(keys) && safeId(d.cartaoId) && validMonth(d.competencia)
        && d.schemaVersion is int && d.schemaVersion==1 && d.versaoConteudo is int && d.versaoConteudo==4
        && safeVersion(d.version);
    }
    function p7EmptyInvoice(f) {
      let c=f.conteudo;
      return c.schemaVersion is int && c.version is int && c.exigivelCentavos is int && c.liquidadoLiquidoCentavos is int
        && c=={'schemaVersion':2,'version':1,'exigivelCentavos':0,'liquidadoLiquidoCentavos':0,'possuiHistoricoPagamento':false,'revisaoEstado':'normal','ultimoEventoTipo':'confirmarFatura','ultimoEventoId':f.ultimoEventoId,'createdAt':request.time,'updatedAt':request.time};
    }
    function p7InvoiceUpdate(uid,id) {
      let f=request.resource.data;
      let b=resource.data;
      let c=f.conteudo;
      let before=b.conteudo;
      let o=getAfter(p7Path(uid,'compras',c.ultimoEventoOrigemId)).data;
      let t=o.comandoAtual.faturas[id];
      let n=invoiceMonthIndex(f.competencia)-invoiceMonthIndex(o.primeiraCompetenciaFatura)+1;
      let key='p0'+string(n);
      return b.schemaVersion==1 && b.versaoConteudo==4 && f.diff(b).affectedKeys().hasOnly(['conteudo'])
        && p7Control(before) && c.diff(before).affectedKeys().hasOnly(['version','exigivelCentavos','ultimoEventoTipo','ultimoEventoId','ultimoEventoOrigemId','updatedAt'])
        && safeVersion(c.version) && p7Money(c.exigivelCentavos) && c.version==before.version+1 && c.updatedAt==request.time
        && c.ultimoEventoTipo=='criarCompra' && c.ultimoEventoId==o.ultimoEventoId
        && o.version==1 && o.createdAt==request.time && o.updatedAt==request.time
        && n>=1 && n<=o.quantidadeParcelas && p7Position(o,key,n) && o.parcelas[key].faturaId==id && p7Capacity(o.parcelas[key],o.categoriaId)
        && t is map && t.keys().hasAll(['calendarioVersion','expectedVersion','resultVersion','deltaCentavos'])
        && t.keys().hasOnly(['calendarioVersion','expectedVersion','resultVersion','deltaCentavos'])
        && safeVersion(t.calendarioVersion) && safeVersion(t.expectedVersion) && safeVersion(t.resultVersion)
        && t.expectedVersion==before.version && t.resultVersion==c.version && t.calendarioVersion==f.version
        && t.deltaCentavos==o.parcelas[key].valorCentavos && p7Open(f)
        && (n!=1 || o.primeiraFaturaEscolha=='explicita' || f.inicio<=o.dataCompra && o.dataCompra<f.fechamento)
        && p7Money(t.deltaCentavos) && t.deltaCentavos>0 && c.exigivelCentavos==before.exigivelCentavos+t.deltaCentavos;
    }
    function p7Use(uid,id) {
      let d=request.resource.data;
      let u=d.usoFinanceiro;
      let r=getAfter(p7Path(uid,'operacoesCompras',u.eventoId)).data;
      let o=getAfter(p7Path(uid,'compras',u.origemId)).data;
      return validCatalogDoc('categorias',resource.data) && validCatalogDoc('categorias',d)
        && resource.data.estado=='ativo' && !('usoFinanceiro' in resource.data)
        && d.diff(resource.data).affectedKeys().hasOnly(['schemaVersion','usoFinanceiro'])
        && d.schemaVersion==2 && d.natureza=='despesa' && u.createdAt==request.time
        && r.compraId==u.origemId && r.createdAt==request.time && o.categoriaId==id && o.ultimoEventoId==u.eventoId;
    }
    match /users/{uid}/compras/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow list: if own(uid) && catalogReady(uid) && request.query.limit is int && request.query.limit>=1 && request.query.limit<=50;
      allow create: if own(uid) && p7Create(uid,id);
      allow update,delete: if false;
    }
    match /users/{uid}/operacoesCompras/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow list: if own(uid) && catalogReady(uid) && request.query.limit is int && request.query.limit>=1 && request.query.limit<=50;
      allow create: if own(uid) && catalogReady(uid) && p7Receipt(uid,id);
      allow update,delete: if false;
    }
`
replaceOnce("^(criarReceita|criarDespesa|gastoImediato|editarOrigem)__", "^(criarReceita|criarDespesa|gastoImediato|editarOrigem|criarCompra)__")
replaceOnce("usePatch() ? financialUsePatch(uid,'categorias',id)", "usePatch() ? (request.resource.data.usoFinanceiro.eventoId.matches('^criarCompra__[A-Za-z0-9-]{1,64}$') ? p7Use(uid,id) : financialUsePatch(uid,'categorias',id))")
replaceOnce("n.data.versaoConteudo is int && n.data.versaoConteudo == 1", "n.data.versaoConteudo is int && n.data.versaoConteudo in [1,4]")
// invoiceCalendar is used only for reciprocal confirmation. The primary fixes
// due==originalDue; the anchored original already proves the Gregorian date.
replaceOnce("&& start is string && closing is string && calendarDate(due)", "&& start is string && closing is string && due == originalDue")
// Both reciprocal calendar checks allow the explicitly validated content map.
const difference = "['schemaVersion','versaoConteudo','version','ultimoEventoId','createdAt','updatedAt'])"
const occurrences = candidate.split(`r.resultado.diff(d).affectedKeys().hasOnly(${difference}`).length - 1
if (occurrences !== 2) throw Error('UNEXPECTED_CALENDAR_RECIPROCITY')
candidate = candidate.replaceAll(`r.resultado.diff(d).affectedKeys().hasOnly(${difference}`, "r.resultado.diff(d).affectedKeys().hasOnly(['schemaVersion','versaoConteudo','version','ultimoEventoId','createdAt','updatedAt','conteudo'])")
replaceOnce("&& (r.tipo == 'confirmarFatura' ? invoiceCalendar(r.resultado) : invoicePreviousDue(r.resultado));", "&& (d.versaoConteudo==1 || p7EmptyInvoice(d) && invoiceNominalDays(d.calendarioOrigem)) && (r.tipo == 'confirmarFatura' ? invoiceCalendar(r.resultado) : invoicePreviousDue(r.resultado));")
replaceOnce("allow create: if own(uid) && catalogReady(uid) && invoiceDoc(request.resource.data) && invoiceMutation(uid,id,true);", "allow create: if own(uid) && catalogReady(uid) && (request.resource.data.versaoConteudo==1 ? invoiceDoc(request.resource.data) : p7InvoiceV4Doc(request.resource.data)) && invoiceMutation(uid,id,true);")
replaceOnce("allow update: if own(uid) && catalogReady(uid) && invoiceDoc(request.resource.data) && invoiceMutation(uid,id,false);", "allow update: if own(uid) && (request.resource.data.versaoConteudo==1 ? catalogReady(uid) && invoiceDoc(request.resource.data) && invoiceMutation(uid,id,false) : p7InvoiceUpdate(uid,id));")
candidate = candidate.replace('\n    match /', () => extension + '\n    match /')
fs.writeFileSync(new URL('firestore-compras-finite.candidate.rules', dir), candidate)
const manifest = { scope: 'finite-creation-existing-v4-invoices-and-explicit-fresh-calendar-only', baseSha256: hash(base), candidateSha256: hash(candidate), bytes: Buffer.byteLength(candidate), productionEnabled: false, compiler: 'NOT_RUN', officialEvaluation: 'NOT_RUN', sdkTests: 'NOT_RUN', limits: { nominalPositions: 12, candidateDestinations: 3, accesses: 18, perWrite: 8 }, denied: ['purchase-edit', 'purchase-cancel', 'invoice-payment', 'refund', 'legacy-initialization', 'calendar-update-v4'] }
fs.writeFileSync(new URL('finite-candidate-manifest.json', dir), JSON.stringify(manifest, null, 2) + '\n')
process.stdout.write(JSON.stringify({ bytes: manifest.bytes, sha256: manifest.candidateSha256, network: false, productionChanged: false }) + '\n')
