import fs from 'node:fs';
import crypto from 'node:crypto';

const root = new URL('../', import.meta.url);
const folder = new URL('specs/010-recorrencias-mensais/', root);
const base = fs.readFileSync(new URL('firestore.rules', root), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const types = ['recCriarSerie', 'recMaterializar', 'recConfirmarValor', 'recEditarEsta', 'recRevisarFuturas', 'recPular', 'recCancelar', 'recEncerrar', 'recPagar', 'recReceber', 'recReverter', 'recInicializarFatura'];
let extra = String.raw`
    // Feature010: complete candidate only; never published by this generator.
    function r10Path(u,c,id) { return /databases/$(database)/documents/users/$(u)/$(c)/$(id); }
    function r10Id(id) { return id is string && id.matches('^[A-Za-z0-9-]{1,40}$'); }
    function r10Event(id) { return id is string && id.matches('^(__TYPES__)__[A-Za-z0-9-]{1,64}$'); }
    function r10Oid(s,m) { return 'r10-'+s+'-'+m[0:4]+m[5:7]; }
    function r10Vid(s,m) { return s+'-'+m[0:4]+m[5:7]; }
    function r10CurrentMonth(m) {
      let t=request.time-duration.value(5,'h');
      return validMonth(m) && invoiceMonthIndex(m)>=t.year()*12+t.month()-1;
    }
    function r10Money(n) { return n is int && n>0 && n<=9007199254740991; }
    function r10Nonnegative(n) { return n is int && n>=0 && n<=9007199254740991; }
    function r10Open(d) {
      let t=request.time-duration.value(5,'h');
      return calendarDate(d) && int(d[0:4])*10000+int(d[5:7])*100+int(d[8:10])>t.year()*10000+t.month()*100+t.day();
    }
    function r10Command(c,s) {
      return c is map && c.keys().hasAll(['tipo','serieId','operationKey','expectedVersion','ocorrenciaIds','ocorrencias','revisoes','referenciasNovas','faturaIds','deltasFaturas','versoesFaturas'])
        && c.keys().hasOnly(['tipo','serieId','operationKey','expectedVersion','ocorrenciaIds','ocorrencias','revisoes','referenciasNovas','faturaIds','deltasFaturas','versoesFaturas','revisaoId','revisaoAnteriorId','mesReferencia','vigencia','motivo','fato','originalEventoId','encerradaDesdeMes'])
        && c.tipo in [__TYPE_LITERALS__] && c.tipo!='recInicializarFatura' && c.serieId==s && safeId(c.operationKey)
        && c.expectedVersion is int && c.expectedVersion>=0 && c.expectedVersion<9007199254740991
        && c.ocorrenciaIds is list && c.ocorrenciaIds.size()<=12 && c.ocorrenciaIds.toSet().size()==c.ocorrenciaIds.size()
        && c.ocorrencias is map && c.ocorrencias.keys().toSet()==c.ocorrenciaIds.toSet() && c.revisoes is map && c.revisoes.size()<=2
        && c.referenciasNovas is map && c.referenciasNovas.keys().hasOnly(['categoriaId','titularId','contaPrevistaId','cartaoId','etiquetaIds'])
        && c.faturaIds is list && c.faturaIds.size()<=2 && c.faturaIds.toSet().size()==c.faturaIds.size()
        && c.versoesFaturas is map && c.versoesFaturas.keys().toSet()==c.faturaIds.toSet()
        && c.deltasFaturas is map && c.deltasFaturas.keys().toSet()==c.faturaIds.toSet()
        && (c.tipo in ['recCancelar','recPular','recEncerrar','recReverter','recEditarEsta','recRevisarFuturas'] ? externalText(c.motivo,1000) : !('motivo' in c))
        && (c.tipo in ['recPagar','recReceber','recReverter'] ? 'fato' in c : !('fato' in c))
        && (c.tipo=='recReverter' ? r10Event(c.originalEventoId) : !('originalEventoId' in c))
        && (!('revisaoId' in c) || c.revisaoId is string && c.revisaoId.size()<=47)
        && (!('revisaoAnteriorId' in c) || c.revisaoAnteriorId is string && c.revisaoAnteriorId.size()<=47)
        && (!('mesReferencia' in c) || validMonth(c.mesReferencia)) && (!('vigencia' in c) || validMonth(c.vigencia))
        && (!('encerradaDesdeMes' in c) || validMonth(c.encerradaDesdeMes)) && r10ByteBound(c);
    }
    function r10TextWeight(d) {
      let b=d.get('financeiro',d);
      return b.get('descricao','').size()+b.get('observacao','').size()+d.get('motivoSupressao','').size();
    }
    function r10PairWeight(p) { return r10TextWeight(p.get('antes',{}))+r10TextWeight(p.get('depois',{})); }
    function r10ByteBound(c) {
      let vs=c.revisoes.keys(); let os=c.ocorrenciaIds;
      return os.size()<=1 && 10000+4*(c.get('motivo','').size()
        +(vs.size()>0 ? r10PairWeight(c.revisoes[vs[0]]):0)+(vs.size()>1 ? r10PairWeight(c.revisoes[vs[1]]):0)
        +(os.size()>0 ? r10PairWeight(c.ocorrencias[os[0]]):0))<=32768;
    }
    function r10Budget(c,n) {
      let p=c.referenciasNovas; let labels=p.get('etiquetaIds',[]).size();
      let refs=(p.get('categoriaId',null)!=null ? 4:0)+(p.get('titularId',null)!=null ? 1:0)+(p.get('contaPrevistaId',null)!=null ? 1:0);
      let initial=c.tipo in ['recMaterializar','recPular'] || c.tipo=='recConfirmarValor' && !('antes' in c.ocorrencias[c.ocorrenciaIds[0]]);
      let card=n=='assinaturaCartao';
      return c.tipo=='recCriarSerie' ? (card ? 7:6)+labels+refs-(p.get('categoriaId',null)!=null ? 1:0)<=18
        : c.tipo=='recRevisarFuturas' ? (card && c.ocorrenciaIds.size()>0 ? 18:14)+labels+refs+(p.get('cartaoId',null)!=null ? 1:0)<=18
        : initial ? (c.tipo=='recPular' ? 9:(card ? 16:10))+labels+(p.get('titularId',null)!=null ? 1:0)+(p.get('contaPrevistaId',null)!=null ? 1:0)<=18
        : c.tipo in ['recEditarEsta','recConfirmarValor'] ? (card ? (c.faturaIds.size()>1 ? 16:10):7)+refs+labels<=18 : true;
    }
    function r10SeriesShape(s) {
      return s is map && s.keys().hasAll(['schemaVersion','version','natureza','inicio','primeiraRevisaoId','estado','ultimoEventoId','comandoAtual','createdAt','updatedAt'])
        && s.keys().hasOnly(['schemaVersion','version','natureza','inicio','terminoOriginal','primeiraRevisaoId','estado','encerradaDesdeMes','ultimoMesOcupado','ultimoEventoId','comandoAtual','createdAt','updatedAt'])
        && s.schemaVersion is int && s.schemaVersion==1 && safeVersion(s.version) && s.natureza in ['receitaExterna','despesaExterna','assinaturaCartao']
        && calendarDate(s.inicio) && (!('terminoOriginal' in s) || calendarDate(s.terminoOriginal) && s.terminoOriginal>=s.inicio)
        && (s.estado=='ativa' ? !('encerradaDesdeMes' in s) : s.estado=='encerrada' && validMonth(s.encerradaDesdeMes))
        && (!('ultimoMesOcupado' in s) || validMonth(s.ultimoMesOcupado)) && r10Event(s.ultimoEventoId)
        && s.createdAt is timestamp && s.updatedAt==request.time;
    }
    function r10Pattern(v) {
      return v is map && v.keys().hasAll(['schemaVersion','serieId','inicioMes','version','descricao','categoriaId','valorCentavos','estimado','diaAncora','ultimoEventoId','createdAt','updatedAt'])
        && v.keys().hasOnly(['schemaVersion','serieId','inicioMes','fimExclusivo','version','descricao','categoriaId','valorCentavos','estimado','diaAncora','titularId','contaPrevistaId','cartaoId','etiquetaIds','observacao','ultimoEventoId','createdAt','updatedAt'])
        && v.schemaVersion is int && v.schemaVersion==1 && r10Id(v.serieId) && validMonth(v.inicioMes) && safeVersion(v.version)
        && (!('fimExclusivo' in v) || validMonth(v.fimExclusivo) && v.fimExclusivo>v.inicioMes)
        && externalText(v.descricao,120) && safeId(v.categoriaId) && r10Money(v.valorCentavos) && v.estimado is bool
        && v.diaAncora is int && v.diaAncora>=1 && v.diaAncora<=31 && r10Event(v.ultimoEventoId)
        && (!('titularId' in v) || safeId(v.titularId)) && (!('contaPrevistaId' in v) || safeId(v.contaPrevistaId))
        && (!('cartaoId' in v) || safeId(v.cartaoId)) && (!('etiquetaIds' in v) || v.etiquetaIds==[] || labelShape(v.etiquetaIds))
        && (!('observacao' in v) || externalText(v.observacao,1000)) && v.createdAt is timestamp && v.updatedAt==request.time;
    }
    function r10RefPatch(a,b,p) {
      return b.categoriaId==p.get('categoriaId',a.get('categoriaId',null))
        && b.get('titularId',null)==p.get('titularId',a.get('titularId',null))
        && b.get('contaPrevistaId',null)==p.get('contaPrevistaId',a.get('contaPrevistaId',null))
        && b.get('cartaoId',null)==p.get('cartaoId',a.get('cartaoId',null))
        && b.get('etiquetaIds',[])==p.get('etiquetaIds',a.get('etiquetaIds',[]));
    }
    function r10Refs(u,p,natureza,checkCard) {
      return (!('categoriaId' in p) || r10Category(u,p.categoriaId,natureza))
        && (p.get('titularId',null)==null || externalHolder(u,p.titularId))
        && (p.get('contaPrevistaId',null)==null || externalPlannedAccount(u,p.contaPrevistaId))
        && (!checkCard || p.get('cartaoId',null)==null || getAfter(r10Path(u,'cartoes',p.cartaoId)).data.estado=='ativo');
    }
    function r10Category(u,id,natureza) {
      let d=getAfter(r10Path(u,'categorias',id)).data;
      return validCatalogDoc('categorias',d) && d.estado=='ativo' && d.schemaVersion==2 && 'usoFinanceiro' in d
        && d.natureza==(natureza=='receitaExterna' ? 'receita':'despesa');
    }
    function r10RevisionWrite(u,id,creating) {
      let d=request.resource.data; let s=getAfter(r10Path(u,'seriesRecorrentes',d.serieId)).data; let c=s.comandoAtual;
      return r10Pattern(d) && id==r10Vid(d.serieId,d.inicioMes) && id in c.revisoes && c.revisoes[id].depois==d
        && c.revisoes[id].keys().hasAll(['depois']) && c.revisoes[id].keys().hasOnly(['antes','depois'])
        && d.ultimoEventoId==s.ultimoEventoId && d.updatedAt==request.time && (creating ? !('antes' in c.revisoes[id]) && d.version==1 && d.createdAt==request.time
          : c.revisoes[id].antes==resource.data && d.version==resource.data.version+1 && d.createdAt==resource.data.createdAt)
        && (s.natureza=='assinaturaCartao' ? 'cartaoId' in d && !d.keys().hasAny(['titularId','contaPrevistaId']) : !('cartaoId' in d))
        && (c.tipo=='recCriarSerie' || id==c.revisaoId ? r10Refs(u,c.referenciasNovas,s.natureza,true) : true);
    }
    function r10Financial(d,n) {
      return d is map && d.keys().hasAll(['descricao','categoriaId','valorCentavos','estimado'])
        && externalText(d.descricao,120) && safeId(d.categoriaId) && r10Money(d.valorCentavos) && d.estimado is bool
        && (!('etiquetaIds' in d) || d.etiquetaIds==[] || labelShape(d.etiquetaIds)) && (!('observacao' in d) || externalText(d.observacao,1000))
        && (n=='assinaturaCartao' ? d.keys().hasAll(['dataCompra','cartaoId','faturaId','competenciaFatura','inicioCiclo','fechamentoCiclo'])
          && d.keys().hasOnly(['descricao','categoriaId','valorCentavos','estimado','dataCompra','cartaoId','faturaId','competenciaFatura','inicioCiclo','fechamentoCiclo','etiquetaIds','observacao'])
          && safeId(d.cartaoId) && calendarDate(d.dataCompra) && validMonth(d.competenciaFatura)
          && d.faturaId==d.cartaoId+'__'+d.competenciaFatura && calendarDate(d.inicioCiclo) && calendarDate(d.fechamentoCiclo) && d.inicioCiclo<d.fechamentoCiclo
          : d.keys().hasAll(['competenciaPlanejamento','liquidadoLiquidoCentavos','jaLiquidada'])
          && d.keys().hasOnly(['descricao','categoriaId','valorCentavos','estimado','competenciaPlanejamento','dataPrevista','vencimento','dataConsumo','titularId','contaPrevistaId','etiquetaIds','observacao','liquidadoLiquidoCentavos','jaLiquidada'])
          && validMonth(d.competenciaPlanejamento) && r10Nonnegative(d.liquidadoLiquidoCentavos) && d.liquidadoLiquidoCentavos<=d.valorCentavos && d.jaLiquidada is bool
          && (d.jaLiquidada || d.liquidadoLiquidoCentavos==0) && (!('titularId' in d) || safeId(d.titularId))
          && (!('contaPrevistaId' in d) || safeId(d.contaPrevistaId))
          && (n=='receitaExterna' ? calendarDate(d.dataPrevista) && !d.keys().hasAny(['vencimento','dataConsumo']) : calendarDate(d.vencimento) && calendarDate(d.dataConsumo) && !('dataPrevista' in d)));
    }
    function r10Capacity(o) {
      let j=o.capacidadeItem; let d=o.financeiro;
      return j is map && j.keys().hasAll(['schemaVersion','valorOriginalCentavos','correcaoAcrescimosCentavos','correcaoReducoesCentavos','devolvidoCentavos','categoriaEfetivaId'])
        && j.keys().hasOnly(['schemaVersion','valorOriginalCentavos','correcaoAcrescimosCentavos','correcaoReducoesCentavos','devolvidoCentavos','categoriaEfetivaId'])
        && j.schemaVersion is int && j.schemaVersion==1 && r10Money(j.valorOriginalCentavos) && r10Nonnegative(j.correcaoAcrescimosCentavos)
        && r10Nonnegative(j.correcaoReducoesCentavos) && r10Nonnegative(j.devolvidoCentavos) && j.categoriaEfetivaId==d.categoriaId
        && j.valorOriginalCentavos+j.correcaoAcrescimosCentavos<=9007199254740991
        && j.valorOriginalCentavos+j.correcaoAcrescimosCentavos-j.correcaoReducoesCentavos-j.devolvidoCentavos==d.valorCentavos;
    }
    function r10Occurrence(o,id) {
      return o is map && o.keys().hasAll(['schemaVersion','version','serieId','mesReferencia','natureza','revisaoId','revisaoVersion','estado','excecaoIndividual','ultimoEventoId','createdAt','updatedAt'])
        && o.keys().hasOnly(['schemaVersion','version','serieId','mesReferencia','natureza','revisaoId','revisaoVersion','estado','excecaoIndividual','motivoSupressao','financeiro','capacidadeItem','ultimoEventoId','createdAt','updatedAt'])
        && o.schemaVersion is int && o.schemaVersion==1 && safeVersion(o.version) && r10Id(o.serieId) && validMonth(o.mesReferencia) && id==r10Oid(o.serieId,o.mesReferencia)
        && o.natureza in ['receitaExterna','despesaExterna','assinaturaCartao'] && o.revisaoId is string && safeVersion(o.revisaoVersion)
        && o.excecaoIndividual is bool && r10Event(o.ultimoEventoId) && o.createdAt is timestamp && o.updatedAt==request.time
        && (o.estado=='pulada' ? externalText(o.motivoSupressao,1000) && o.excecaoIndividual && !o.keys().hasAny(['financeiro','capacidadeItem'])
          : o.estado in ['persistida','cancelada'] && r10Financial(o.financeiro,o.natureza)
          && (o.natureza=='assinaturaCartao' ? r10Capacity(o) : !('capacidadeItem' in o))
          && (o.estado=='cancelada' ? externalText(o.motivoSupressao,1000) && o.excecaoIndividual : !('motivoSupressao' in o)));
    }
    function r10Initial(o,v,s,c) {
      let d=o.financeiro; let date=invoiceDate(invoiceMonthIndex(o.mesReferencia),v.diaAncora);
      return o.revisaoId==r10Vid(o.serieId,v.inicioMes) && o.revisaoVersion==v.version && o.natureza==s.natureza
        && (c.tipo=='recPular' ? o.estado=='pulada' : o.estado=='persistida')
        && o.mesReferencia>=v.inicioMes && (!('fimExclusivo' in v) || o.mesReferencia<v.fimExclusivo)
        && date>=s.inicio && (!('terminoOriginal' in s) || date<=s.terminoOriginal)
        && (!('encerradaDesdeMes' in s) || o.mesReferencia<s.encerradaDesdeMes)
        && (o.estado=='pulada' ? c.tipo=='recPular' && o.motivoSupressao==c.motivo
          : d.descricao==v.descricao && r10RefPatch(v,d,{}) && d.get('observacao',null)==v.get('observacao',null)
          && (c.tipo=='recConfirmarValor' ? d.estimado==false && o.excecaoIndividual : d.valorCentavos==v.valorCentavos && d.estimado==v.estimado && !o.excecaoIndividual)
          && (o.natureza=='assinaturaCartao' ? d.dataCompra==date && o.capacidadeItem.valorOriginalCentavos==d.valorCentavos
            && o.capacidadeItem.correcaoAcrescimosCentavos==0 && o.capacidadeItem.correcaoReducoesCentavos==0 && o.capacidadeItem.devolvidoCentavos==0
            : d.get('dataPrevista',d.get('vencimento',null))==date && (o.natureza!='despesaExterna' || d.dataConsumo==date)
            && d.competenciaPlanejamento==o.mesReferencia && d.liquidadoLiquidoCentavos==0 && d.jaLiquidada==false));
    }
    function r10CardNew(u,d) {
      let card=getAfter(r10Path(u,'cartoes',d.cartaoId)).data; let f=get(r10Path(u,'faturas',d.faturaId)).data;
      return card.schemaVersion==1 && card.estado=='ativo' && invoiceDoc(f) && f.cartaoId==d.cartaoId
        && f.competencia==d.competenciaFatura && f.inicio==d.inicioCiclo && f.fechamento==d.fechamentoCiclo && r10Open(f.fechamento);
    }
    function r10Editable(a) {
      return a.estado=='persistida' && (a.natureza=='assinaturaCartao' ? r10Open(a.financeiro.fechamentoCiclo) : a.financeiro.jaLiquidada==false && a.financeiro.liquidadoLiquidoCentavos==0);
    }
    function r10Edit(a,b,c) {
      return r10Editable(a) && b.estado=='persistida'
        && b.diff(a).affectedKeys().hasOnly(['version','revisaoId','revisaoVersion','excecaoIndividual','financeiro','capacidadeItem','ultimoEventoId','updatedAt'])
        && r10RefPatch(a.financeiro,b.financeiro,c.referenciasNovas)
        && (a.natureza=='assinaturaCartao' ? b.capacidadeItem.valorOriginalCentavos==a.capacidadeItem.valorOriginalCentavos
          && b.capacidadeItem.devolvidoCentavos==a.capacidadeItem.devolvidoCentavos
          && b.capacidadeItem.correcaoAcrescimosCentavos==a.capacidadeItem.correcaoAcrescimosCentavos+(b.financeiro.valorCentavos>a.financeiro.valorCentavos ? b.financeiro.valorCentavos-a.financeiro.valorCentavos:0)
          && b.capacidadeItem.correcaoReducoesCentavos==a.capacidadeItem.correcaoReducoesCentavos+(b.financeiro.valorCentavos<a.financeiro.valorCentavos ? a.financeiro.valorCentavos-b.financeiro.valorCentavos:0)
          && (a.financeiro.faturaId!=b.financeiro.faturaId || b.financeiro.inicioCiclo==a.financeiro.inicioCiclo && b.financeiro.fechamentoCiclo==a.financeiro.fechamentoCiclo)
          : b.financeiro.liquidadoLiquidoCentavos==0 && b.financeiro.jaLiquidada==false)
        && (c.tipo=='recConfirmarValor' ? b.financeiro.estimado==false && b.excecaoIndividual
          && b.financeiro.diff(a.financeiro).affectedKeys().hasOnly(['valorCentavos','estimado'])
          : c.tipo=='recRevisarFuturas' ? !a.excecaoIndividual && !b.excecaoIndividual : b.excecaoIndividual);
    }
    function r10Pay(u,a,b,c) {
      let f=c.fato; let account=getAfter(r10Path(u,'contas',f.contaId)).data;
      return a.estado=='persistida' && a.natureza!='assinaturaCartao' && !a.financeiro.estimado && b.estado==a.estado
        && b.diff(a).affectedKeys().hasOnly(['version','financeiro','ultimoEventoId','updatedAt'])
        && b.financeiro.diff(a.financeiro).affectedKeys().hasOnly(['liquidadoLiquidoCentavos','jaLiquidada'])
        && f.keys().hasAll(['tipo','contaId','valorCentavos','dataEfetiva']) && f.keys().hasOnly(['tipo','contaId','valorCentavos','dataEfetiva'])
        && f.tipo==(a.natureza=='receitaExterna' ? 'recebimento':'pagamento') && c.tipo==(a.natureza=='receitaExterna' ? 'recReceber':'recPagar')
        && r10Money(f.valorCentavos) && calendarDate(f.dataEfetiva) && notFuture(f.dataEfetiva)
        && validCatalogDoc('contas',account) && account.schemaVersion==2 && account.estado=='ativo' && 'usoFinanceiro' in account
        && b.financeiro.jaLiquidada==true && b.financeiro.liquidadoLiquidoCentavos==a.financeiro.liquidadoLiquidoCentavos+f.valorCentavos;
    }
    function r10Reverse(u,a,b,c) {
      let original=get(r10Path(u,'operacoesRecorrentes',c.originalEventoId)).data;
      let marker=getAfter(r10Path(u,'reversoesRecorrentes',c.originalEventoId)).data;
      return original.tipo in ['recPagar','recReceber'] && original.serieId==a.serieId && original.comando.ocorrenciaIds==c.ocorrenciaIds
        && c.fato=={'tipo':(original.fato.tipo=='pagamento' ? 'reversaoPagamento':'reversaoRecebimento'),'contaId':original.fato.contaId,'valorCentavos':original.fato.valorCentavos,'dataEfetiva':original.fato.dataEfetiva,'originalId':c.originalEventoId,'motivo':c.motivo}
        && a.natureza!='assinaturaCartao' && a.estado=='persistida' && a.financeiro.jaLiquidada && b.financeiro.jaLiquidada
        && b.diff(a).affectedKeys().hasOnly(['version','financeiro','ultimoEventoId','updatedAt'])
        && b.financeiro.diff(a.financeiro).affectedKeys().hasOnly(['liquidadoLiquidoCentavos'])
        && b.financeiro.liquidadoLiquidoCentavos==a.financeiro.liquidadoLiquidoCentavos-c.fato.valorCentavos
        && marker.originalEventoId==c.originalEventoId && marker.reversaoEventoId==b.ultimoEventoId && marker.serieId==a.serieId;
    }
    function r10OccurrenceWrite(u,id,creating) {
      let b=request.resource.data; let s=getAfter(r10Path(u,'seriesRecorrentes',b.serieId)).data; let c=s.comandoAtual;
      return r10Occurrence(b,id) && b.natureza==s.natureza && id in c.ocorrencias && c.ocorrencias[id].depois==b && b.ultimoEventoId==s.ultimoEventoId
        && c.ocorrencias[id].keys().hasAll(['depois']) && c.ocorrencias[id].keys().hasOnly(['antes','depois'])
        && (creating ? !('antes' in c.ocorrencias[id]) && b.version==1 && b.createdAt==request.time && c.tipo in ['recMaterializar','recConfirmarValor','recPular']
          : c.ocorrencias[id].antes==resource.data && b.version==resource.data.version+1 && b.createdAt==resource.data.createdAt
          && b.mesReferencia==resource.data.mesReferencia && b.serieId==resource.data.serieId && b.natureza==resource.data.natureza
          && (c.tipo in ['recEditarEsta','recConfirmarValor','recRevisarFuturas'] ? r10Edit(resource.data,b,c)
            : c.tipo in ['recPagar','recReceber'] ? r10Pay(u,resource.data,b,c)
            : c.tipo=='recReverter' ? r10Reverse(u,resource.data,b,c)
            : c.tipo=='recCancelar' && r10Editable(resource.data) && b.estado=='cancelada' && b.excecaoIndividual && b.motivoSupressao==c.motivo
              && b.diff(resource.data).affectedKeys().hasOnly(['version','estado','excecaoIndividual','motivoSupressao','ultimoEventoId','updatedAt'])))
        && (c.tipo in ['recPagar','recReceber','recReverter','recCancelar','recPular'] ? c.referenciasNovas=={} : r10Refs(u,c.referenciasNovas,b.natureza,false))
        && (b.natureza=='assinaturaCartao' && b.estado=='persistida' && (creating || resource.data.financeiro.faturaId!=b.financeiro.faturaId) ? r10CardNew(u,b.financeiro) : true);
    }
    function r10MonthMax(a,b) { return a>b ? a:b; }
    function r10Single(u,s,c) {
      let id=r10Oid(c.serieId,c.mesReferencia); let o=getAfter(r10Path(u,'ocorrenciasRecorrentes',id)).data;
      return validMonth(c.mesReferencia) && c.ocorrenciaIds==[id] && o==c.ocorrencias[id].depois && o.ultimoEventoId==s.ultimoEventoId
        && s.ultimoMesOcupado==r10MonthMax(resource.data.get('ultimoMesOcupado',''),c.mesReferencia)
        && c.revisoes=={} && (c.tipo in ['recMaterializar','recConfirmarValor','recPular'] && !('antes' in c.ocorrencias[id]) ? r10SingleInitial(u,s,o,c) : true);
    }
    function r10SingleInitial(u,s,o,c) {
      let v=get(r10Path(u,'revisoesRecorrentes',c.revisaoId)).data;
      return c.revisaoId==o.revisaoId && r10Initial(o,v,s,c)
        && (o.estado=='pulada' ? c.referenciasNovas=={} : r10RefPatch({},o.financeiro,c.referenciasNovas));
    }
    function r10IntervalEnd(a,v) {
      return 'fimExclusivo' in v && v.fimExclusivo<=a.get('ultimoMesOcupado','') ? invoiceMonth(invoiceMonthIndex(v.fimExclusivo)-1) : a.get('ultimoMesOcupado','');
    }
    function r10FutureSlot(u,s,c,v,offset) {
      let month=invoiceMonth(invoiceMonthIndex(c.vigencia)+offset); let id=r10Oid(c.serieId,month);
      return month>r10IntervalEnd(resource.data,v) ? !(id in c.ocorrencias) : r10FutureExisting(u,s,c,id);
    }
    function r10FutureExisting(u,s,c,id) {
      let before=get(r10Path(u,'ocorrenciasRecorrentes',id));
      return before==null ? !(id in c.ocorrencias) : r10FutureKnown(u,s,c,id,before.data);
    }
    function r10FutureKnown(u,s,c,id,a) {
      let eligible=r10Editable(a) && !a.excecaoIndividual;
      return a.natureza=='assinaturaCartao' && eligible ? r10FutureCard(u,s,c,id,a)
        : (id in c.ocorrencias)==eligible && (!eligible || r10FutureAfter(u,s,c,id,a));
    }
    function r10FutureCard(u,s,c,id,a) {
      let g=get(r10Path(u,'controlesFaturas',a.financeiro.faturaId)).data;
      return (id in c.ocorrencias)==(g.possuiHistoricoPagamento==false && g.revisaoEstado=='normal')
        && (!(id in c.ocorrencias) || r10FutureAfter(u,s,c,id,a));
    }
    function r10FutureAfter(u,s,c,id,a) {
      let b=getAfter(r10Path(u,'ocorrenciasRecorrentes',id)).data; let v=c.revisoes[c.revisaoId].depois;
      let date=invoiceDate(invoiceMonthIndex(a.mesReferencia),v.diaAncora);
      return c.ocorrencias[id].antes==a && c.ocorrencias[id].depois==b && b.revisaoId==c.revisaoId && b.revisaoVersion==v.version
        && b.financeiro.descricao==v.descricao && b.financeiro.valorCentavos==v.valorCentavos && b.financeiro.estimado==v.estimado
        && r10RefPatch(v,b.financeiro,{}) && b.financeiro.get('observacao',null)==v.get('observacao',null)
        && b.financeiro.get('dataCompra',b.financeiro.get('dataPrevista',b.financeiro.get('vencimento',null)))==date;
    }
    function r10Revisions(u,s,c) {
      let before=get(r10Path(u,'revisoesRecorrentes',c.revisaoAnteriorId)).data;
      let prior=c.revisaoAnteriorId==c.revisaoId ? null:getAfter(r10Path(u,'revisoesRecorrentes',c.revisaoAnteriorId)).data;
      let after=getAfter(r10Path(u,'revisoesRecorrentes',c.revisaoId)).data;
      return r10CurrentMonth(c.vigencia) && before.serieId==c.serieId && before.inicioMes<=c.vigencia && (!('fimExclusivo' in before) || c.vigencia<before.fimExclusivo)
        && c.revisaoId==r10Vid(c.serieId,c.vigencia) && c.revisoes[c.revisaoId].depois==after && c.revisoes[c.revisaoAnteriorId].antes==before
        && after.inicioMes==c.vigencia && after.get('fimExclusivo',null)==before.get('fimExclusivo',null)
        && r10RefPatch(before,after,c.referenciasNovas)
        && (c.revisaoAnteriorId==c.revisaoId ? c.revisoes.size()==1
          : c.revisoes.size()==2 && c.revisoes[c.revisaoAnteriorId].depois==prior && prior.fimExclusivo==c.vigencia
            && prior.diff(before).affectedKeys().hasOnly(['version','fimExclusivo','ultimoEventoId','updatedAt']))
        && r10IntervalEnd(resource.data,before)<invoiceMonth(invoiceMonthIndex(c.vigencia)+1)
        && c.ocorrenciaIds.toSet().hasOnly([__FUTURE_IDS__]) && __FUTURE_CHECKS__;
    }
    function r10SeriesWrite(u,id,creating) {
      let b=request.resource.data; let c=b.comandoAtual; let r=getAfter(r10Path(u,'operacoesRecorrentes',b.ultimoEventoId)).data;
      return r10Id(id) && r10SeriesShape(b) && r10Command(c,id) && r10Budget(c,b.natureza) && b.ultimoEventoId==c.tipo+'__'+c.operationKey && r.comando==c
        && r.resultVersion==b.version && r.createdAt==request.time && c.expectedVersion==(creating ? 0:resource.data.version)
        && (creating ? c.tipo=='recCriarSerie' && b.version==1 && b.createdAt==request.time && b.estado=='ativa' && !('ultimoMesOcupado' in b)
          && c.ocorrencias=={} && c.ocorrenciaIds==[] && c.revisoes.size()==1 && b.primeiraRevisaoId==r10Vid(id,b.inicio[0:7])
          && r10CreateRevision(u,b,c)
          : b.version==resource.data.version+1 && b.createdAt==resource.data.createdAt
          && b.diff(resource.data).affectedKeys().hasOnly(['version','comandoAtual','ultimoMesOcupado','estado','encerradaDesdeMes','ultimoEventoId','updatedAt'])
          && (c.tipo=='recEncerrar' ? resource.data.estado=='ativa' && b.estado=='encerrada' && r10CurrentMonth(c.encerradaDesdeMes)
            && b.encerradaDesdeMes==c.encerradaDesdeMes && b.get('ultimoMesOcupado',null)==resource.data.get('ultimoMesOcupado',null) && c.ocorrencias=={} && c.revisoes=={}
            : b.estado==resource.data.estado && b.get('encerradaDesdeMes',null)==resource.data.get('encerradaDesdeMes',null)
              && (c.tipo=='recRevisarFuturas' ? resource.data.estado=='ativa' && b.get('ultimoMesOcupado',null)==resource.data.get('ultimoMesOcupado',null) && r10Revisions(u,b,c)
                : c.tipo!='recCriarSerie' && r10Single(u,b,c))));
    }
    function r10CreateRevision(u,s,c) {
      let v=getAfter(r10Path(u,'revisoesRecorrentes',s.primeiraRevisaoId)).data;
      return v==c.revisoes[s.primeiraRevisaoId].depois && v.inicioMes==s.inicio[0:7] && !('fimExclusivo' in v)
        && !('antes' in c.revisoes[s.primeiraRevisaoId]) && c.revisaoId==s.primeiraRevisaoId && r10RefPatch({},v,c.referenciasNovas);
    }
    function r10ItemAmount(o,id) {
      return o.get('estado','')=='persistida' && o.get('natureza','')=='assinaturaCartao' && o.financeiro.faturaId==id ? o.financeiro.valorCentavos:0;
    }
    function r10DeltaSlot(c,id,n) {
      let key=n<c.ocorrenciaIds.size() ? c.ocorrenciaIds[n]:''; let item=c.ocorrencias.get(key,{});
      return n<c.ocorrenciaIds.size() ? r10ItemAmount(item.depois,id)-r10ItemAmount(item.get('antes',{}),id):0;
    }
    function r10FaturaSlot(c,n) {
      let key=n<c.ocorrenciaIds.size() ? c.ocorrenciaIds[n]:''; let pair=c.ocorrencias.get(key,{});
      let a=pair.get('antes',{}); let b=pair.get('depois',{});
      return (a.get('natureza','')=='assinaturaCartao' && a.get('estado','')=='persistida' ? [a.financeiro.faturaId]:[])
        .concat(b.get('natureza','')=='assinaturaCartao' && b.get('estado','')=='persistida' ? [b.financeiro.faturaId]:[]);
    }
    function r10Delta(c,id) { return __DELTA__; }
    function r10Receipt(u,id) {
      let r=request.resource.data; let c=r.comando;
      return r.keys().hasAll(['schemaVersion','contractVersion','tipo','operationKey','serieId','expectedVersion','resultVersion','comando','createdAt'])
        && r.keys().hasOnly(['schemaVersion','contractVersion','tipo','operationKey','serieId','expectedVersion','resultVersion','comando','fato','createdAt'])
        && r.schemaVersion is int && r.schemaVersion==1 && r.contractVersion is int && r.contractVersion==1
        && r10Event(id) && id==r.tipo+'__'+r.operationKey && c.tipo==r.tipo && c.operationKey==r.operationKey
        && r.expectedVersion==c.expectedVersion && r.resultVersion==r.expectedVersion+1 && r.createdAt==request.time
        && (r.tipo=='recInicializarFatura' ? r10InitReceipt(u,id,r) : r10NormalReceipt(u,id,r)) && catalogReady(u);
    }
    function r10NormalReceipt(u,id,r) {
      let s=getAfter(r10Path(u,'seriesRecorrentes',r.serieId)).data; let c=r.comando;
      return s.ultimoEventoId==id && s.version==r.resultVersion && s.comandoAtual==c && r.serieId==c.serieId
        && (c.tipo in ['recPagar','recReceber','recReverter'] ? r.fato==c.fato : !('fato' in r))
        && (!('etiquetaIds' in c.referenciasNovas) || c.referenciasNovas.etiquetaIds==[] || labelShape(c.referenciasNovas.etiquetaIds)) && externalLabels(u,c.referenciasNovas)
        && c.faturaIds.toSet()==(__FATURAS__).toSet()
        && (c.faturaIds.size()<1 || r10AfterControl(u,c,c.faturaIds[0],id))
        && (c.faturaIds.size()<2 || r10AfterControl(u,c,c.faturaIds[1],id));
    }
    function r10AfterControl(u,c,id,event) {
      let g=getAfter(r10Path(u,'controlesFaturas',id)).data;
      return g.ultimoEventoId==event && c.deltasFaturas[id]==r10Delta(c,id) && g.version==c.get('versoesFaturas',{}).get(id,-1)+1;
    }
    function r10ControlShape(g,id) {
      return g.keys().hasAll(['schemaVersion','faturaId','cartaoId','competencia','calendarioVersion','version','exigivelCentavos','liquidadoLiquidoCentavos','possuiHistoricoPagamento','revisaoEstado','ultimoEventoTipo','ultimoEventoId','createdAt','updatedAt'])
        && g.keys().hasOnly(['schemaVersion','faturaId','cartaoId','competencia','calendarioVersion','version','exigivelCentavos','liquidadoLiquidoCentavos','possuiHistoricoPagamento','revisaoEstado','ultimoEventoTipo','ultimoEventoId','createdAt','updatedAt'])
        && g.schemaVersion is int && g.schemaVersion==2 && id==g.faturaId && id==g.cartaoId+'__'+g.competencia && validMonth(g.competencia)
        && safeVersion(g.version) && safeVersion(g.calendarioVersion) && r10Nonnegative(g.exigivelCentavos) && r10Nonnegative(g.liquidadoLiquidoCentavos)
        && g.liquidadoLiquidoCentavos<=g.exigivelCentavos && g.possuiHistoricoPagamento is bool && g.revisaoEstado=='normal'
        && g.createdAt is timestamp && g.updatedAt==request.time;
    }
    function r10ControlWrite(u,id,creating) {
      return !creating && request.resource.data.ultimoEventoTipo=='calendario006' ? r10CalendarControl(u,id) : r10NormalControl(u,id,creating);
    }
    function r10CalendarGuard(u,id) {
      let before=get(r10Path(u,'controlesFaturas',id));
      return before==null || r10CalendarAfter(u,id,before.data);
    }
    function r10CalendarAfter(u,id,a) {
      let after=getAfter(r10Path(u,'controlesFaturas',id)).data;
      return after.version==a.version+1 && after.ultimoEventoTipo=='calendario006' && after.ultimoEventoId==request.resource.data.ultimoEventoId;
    }
    function r10CalendarControl(u,id) {
      let b=request.resource.data; let f=getAfter(r10Path(u,'faturas',id)).data;
      let r=getAfter(r10Path(u,'operacoesFaturas',b.ultimoEventoId)).data;
      return r10ControlShape(b,id) && b.version==resource.data.version+1 && b.ultimoEventoTipo=='calendario006'
        && b.diff(resource.data).affectedKeys().hasOnly(['version','calendarioVersion','ultimoEventoTipo','ultimoEventoId','updatedAt'])
        && b.calendarioVersion==resource.data.calendarioVersion+1 && b.calendarioVersion==f.version
        && f.ultimoEventoId==b.ultimoEventoId && f.version==r.resultVersion && r.tipo=='ajustarVencimento' && r.alvoId==id && r.createdAt==request.time;
    }
    function r10NormalControl(u,id,creating) {
      let b=request.resource.data; let r=getAfter(r10Path(u,'operacoesRecorrentes',b.ultimoEventoId)).data;
      return r10ControlShape(b,id) && b.ultimoEventoTipo==r.tipo && r.createdAt==request.time
        && (creating ? r.tipo=='recInicializarFatura' && r.comando.faturaId==id && b.version==1 && b.createdAt==request.time
          && b.exigivelCentavos==0 && b.liquidadoLiquidoCentavos==0 && !b.possuiHistoricoPagamento && r10EmptyCalendar(u,id,b)
          : id in r.comando.faturaIds && r.comando.versoesFaturas[id]==resource.data.version && b.version==resource.data.version+1
            && b.diff(resource.data).affectedKeys().hasOnly(['version','exigivelCentavos','ultimoEventoTipo','ultimoEventoId','updatedAt'])
            && !resource.data.possuiHistoricoPagamento && resource.data.revisaoEstado=='normal'
            && b.exigivelCentavos==resource.data.exigivelCentavos+r.comando.deltasFaturas[id]);
    }
    function r10EmptyCalendar(u,id,g) {
      let f=get(r10Path(u,'faturas',id)).data; let after=getAfter(r10Path(u,'faturas',id)).data;
      return after==f && g.calendarioVersion==f.version && invoiceDoc(f) && f.versaoConteudo==1 && f.cartaoId==g.cartaoId && f.competencia==g.competencia;
    }
    function r10InitReceipt(u,id,r) {
      let c=r.comando; let g=getAfter(r10Path(u,'controlesFaturas',c.faturaId)).data;
      return c.keys().hasAll(['tipo','operationKey','expectedVersion','faturaId']) && c.keys().hasOnly(['tipo','operationKey','expectedVersion','faturaId'])
        && r.serieId=='' && r.expectedVersion==0 && r.resultVersion==1 && !('fato' in r)
        && g.ultimoEventoId==id && g.version==1 && g.ultimoEventoTipo==r.tipo;
    }
    function r10Marker(u,id) {
      let m=request.resource.data; let r=getAfter(r10Path(u,'operacoesRecorrentes',m.reversaoEventoId)).data;
      return m.keys().hasAll(['serieId','originalEventoId','reversaoEventoId','createdAt']) && m.keys().hasOnly(['serieId','originalEventoId','reversaoEventoId','createdAt'])
        && m.originalEventoId==id && m.createdAt==request.time && r.tipo=='recReverter' && r.serieId==m.serieId && r.comando.originalEventoId==id;
    }
    function r10Use(u,c,id) {
      let d=request.resource.data; let before=resource.data; let use=d.usoFinanceiro;
      let old=get(r10Path(u,'operacoesRecorrentes',use.eventoId)); let r=getAfter(r10Path(u,'operacoesRecorrentes',use.eventoId)).data;
      return old==null && r.createdAt==request.time && r10Event(use.eventoId) && use.createdAt==request.time && use.origemId==r.serieId
        && !('usoFinanceiro' in before) && d.diff(before).affectedKeys().hasOnly(['schemaVersion','usoFinanceiro'])
        && d.schemaVersion is int && d.schemaVersion==2 && validCatalogDoc(c,d)
        && (c=='categorias' ? use.papel=='classificacao' && r.tipo in ['recCriarSerie','recEditarEsta','recRevisarFuturas'] && r.comando.referenciasNovas.categoriaId==id
          : use.papel=='movimentacao' && r.tipo in ['recPagar','recReceber'] && r.fato.contaId==id);
    }
    match /users/{uid}/seriesRecorrentes/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow list: if own(uid) && catalogReady(uid) && request.query.limit is int && request.query.limit>=1 && request.query.limit<=50;
      allow create: if own(uid) && r10SeriesWrite(uid,id,true);
      allow update: if own(uid) && r10SeriesWrite(uid,id,false);
      allow delete: if false;
    }
    match /users/{uid}/revisoesRecorrentes/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow list: if own(uid) && catalogReady(uid) && request.query.limit is int && request.query.limit>=1 && request.query.limit<=50;
      allow create: if own(uid) && r10RevisionWrite(uid,id,true);
      allow update: if own(uid) && r10RevisionWrite(uid,id,false);
      allow delete: if false;
    }
    match /users/{uid}/ocorrenciasRecorrentes/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow list: if own(uid) && catalogReady(uid) && request.query.limit is int && request.query.limit>=1 && request.query.limit<=50;
      allow create: if own(uid) && r10OccurrenceWrite(uid,id,true);
      allow update: if own(uid) && r10OccurrenceWrite(uid,id,false);
      allow delete: if false;
    }
    match /users/{uid}/operacoesRecorrentes/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow list: if own(uid) && catalogReady(uid) && request.query.limit is int && request.query.limit>=1 && request.query.limit<=50;
      allow create: if own(uid) && r10Receipt(uid,id);
      allow update,delete: if false;
    }
    match /users/{uid}/reversoesRecorrentes/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow create: if own(uid) && r10Marker(uid,id);
      allow list,update,delete: if false;
    }
    match /users/{uid}/controlesFaturas/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow list: if own(uid) && catalogReady(uid) && request.query.limit is int && request.query.limit>=1 && request.query.limit<=50;
      allow create: if own(uid) && r10ControlWrite(uid,id,true);
      allow update: if own(uid) && r10ControlWrite(uid,id,false);
      allow delete: if false;
    }
`;
extra = extra.replace('__TYPES__', types.join('|')).replace('__TYPE_LITERALS__', types.map(value => `'${value}'`).join(','));
extra = extra.replace('__FUTURE_IDS__', Array.from({ length: 12 }, (_, i) => `r10Oid(c.serieId,invoiceMonth(invoiceMonthIndex(c.vigencia)+${i}))`).join(','));
extra = extra.replace('__FUTURE_CHECKS__', Array.from({ length: 12 }, (_, i) => `r10FutureSlot(u,s,c,before,${i})`).join(' && '));
extra = extra.replace('__DELTA__', Array.from({ length: 12 }, (_, i) => `r10DeltaSlot(c,id,${i})`).join('+'));
extra = extra.replace('__FATURAS__', Array.from({ length: 12 }, (_, i) => `r10FaturaSlot(c,${i})`).join('.concat(') + ')'.repeat(11));
let candidate = base;
candidate = candidate.replace('^(criarReceita|criarDespesa|gastoImediato|editarOrigem)__', '^(criarReceita|criarDespesa|gastoImediato|editarOrigem|recCriarSerie|recEditarEsta|recRevisarFuturas)__');
candidate = candidate.replace('^(pagar|receber|gastoImediato)__', '^(pagar|receber|gastoImediato|recPagar|recReceber)__');
for (const collection of ['categorias', 'contas']) {
  const old = `usePatch() ? financialUsePatch(uid,'${collection}',id)`;
  if (!candidate.includes(old)) throw new Error(`BASE_PATTERN_CHANGED:${collection}`);
  candidate = candidate.replace(old, `usePatch() ? (r10Event(request.resource.data.usoFinanceiro.eventoId) ? r10Use(uid,'${collection}',id) : financialUsePatch(uid,'${collection}',id))`);
}
const invoiceUpdate = 'invoiceMutation(uid,id,false);';
if (!candidate.includes(invoiceUpdate)) throw new Error('BASE_PATTERN_CHANGED:invoiceUpdate');
candidate = candidate.replace(invoiceUpdate, 'invoiceMutation(uid,id,false) && r10CalendarGuard(uid,id);');
candidate = candidate.replace('\n    match /', () => extra + '\n    match /');
fs.writeFileSync(new URL('firestore-recorrencias.candidate.rules', folder), candidate);
fs.writeFileSync(new URL('candidate-manifest.json', folder), JSON.stringify({ mode: 'candidate-only-no-deploy', baseSha256: hash(base), candidateSha256: hash(candidate), bytes: Buffer.byteLength(candidate), constructionComplete: true, proofPending: ['official-compilation-and-budget-proof', 'all-input-byte-bound-and-sdk'], collections: ['seriesRecorrentes', 'revisoesRecorrentes', 'ocorrenciasRecorrentes', 'operacoesRecorrentes', 'reversoesRecorrentes', 'controlesFaturas'] }, null, 2) + '\n');
process.stdout.write(JSON.stringify({ bytes: Buffer.byteLength(candidate), constructionComplete: true, deployment: false }) + '\n');



